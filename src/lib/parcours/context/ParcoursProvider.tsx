"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { obtenirMonParcours } from "@/lib/actions/parcours/parcours.actions";
import {
  syncUserDossierStatus,
  syncAllUserDossiers,
} from "@/lib/actions/demarches-simplifies/sync.actions";
import { getValidationAmo } from "@/lib/actions/parcours/amo/amo.actions";
import {
  ParcoursPrevention,
  DossierDemarchesSimplifiees,
} from "@/lib/database/schema";
import { Step, DSStatus } from "@/lib/parcours/parcours.types";
import { StatutValidationAmo } from "@/lib/parcours/amo/amo.types";
import { useRouter } from "next/navigation";
import { ParcoursContext } from "./ParcoursContext";

interface ParcoursProviderProps {
  children: React.ReactNode;
  autoSync?: boolean;
  syncInterval?: number;
}

export function ParcoursProvider({
  children,
  autoSync = false,
  syncInterval = 300000,
}: ParcoursProviderProps) {
  const router = useRouter();

  // État principal
  const [parcours, setParcours] = useState<ParcoursPrevention | null>(null);
  const [dossiers, setDossiers] = useState<DossierDemarchesSimplifiees[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // État AMO
  const [statutAmo, setStatutAmo] = useState<StatutValidationAmo | null>(null);

  // État de synchronisation
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [lastDSStatus, setLastDSStatus] = useState<DSStatus | null>(null);

  // Données calculées
  const [isComplete, setIsComplete] = useState(false);
  const [prochainEtape, setProchainEtape] = useState<Step | null>(null);

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  // Fonction de chargement du parcours
  const fetchParcours = useCallback(async () => {
    try {
      setError(null);
      const result = await obtenirMonParcours();

      if (result.success && result.data) {
        setParcours(result.data.parcours);
        setDossiers(result.data.dossiers);
        setIsComplete(result.data.isComplete);
        setProchainEtape(result.data.prochainEtape);

        const currentDossier = result.data.dossiers.find(
          (d) => d.step === result.data.parcours.currentStep
        );
        if (currentDossier) {
          setLastDSStatus(currentDossier.dsStatus);
        }

        // Récupérer le statut AMO si on est à l'étape CHOIX_AMO
        if (result.data.parcours.currentStep === Step.CHOIX_AMO) {
          const validationResult = await getValidationAmo();
          if (validationResult.success && validationResult.data) {
            setStatutAmo(validationResult.data.statut);
          } else {
            setStatutAmo(null);
          }
        } else {
          setStatutAmo(null);
        }
      } else {
        const errorMessage =
          !result.success && result.error
            ? result.error
            : "Impossible de récupérer le parcours";
        setError(errorMessage);
      }
    } catch (err) {
      console.error("Erreur lors du chargement du parcours:", err);
      setError("Erreur lors du chargement");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fonction de synchronisation stabilisée
  const syncNow = useCallback(
    async (step?: Step) => {
      if (isSyncingRef.current) return;

      isSyncingRef.current = true;
      setIsSyncing(true);
      setError(null);

      try {
        const targetStep = step || parcours?.currentStep || Step.CHOIX_AMO;
        const result = await syncUserDossierStatus(targetStep);

        if (result.success && result.data) {
          setLastSync(new Date());

          if (
            result.data.newStatus &&
            result.data.newStatus !== DSStatus.NON_ACCESSIBLE
          ) {
            setLastDSStatus(result.data.newStatus as DSStatus);
          }

          if (result.data.updated) {
            await fetchParcours();

            if (result.data.shouldRefresh) {
              router.refresh();
            }
          }
        } else {
          const errorMessage =
            !result.success && result.error
              ? result.error
              : "Erreur de synchronisation";
          setError(errorMessage);
        }
      } catch (err) {
        console.error("Erreur sync:", err);
        setError("Erreur lors de la synchronisation");
      } finally {
        setIsSyncing(false);
        isSyncingRef.current = false;
      }
    },
    [parcours?.currentStep, fetchParcours, router]
  );

  // Fonction de synchronisation complète
  const syncAll = useCallback(async () => {
    if (isSyncingRef.current) return;

    isSyncingRef.current = true;
    setIsSyncing(true);
    setError(null);

    try {
      const result = await syncAllUserDossiers();

      if (result.success && result.data) {
        setLastSync(new Date());

        if (result.data.totalUpdated > 0) {
          await fetchParcours();
          router.refresh();
        }
      } else {
        const errorMessage =
          !result.success && result.error
            ? result.error
            : "Erreur de synchronisation complète";
        setError(errorMessage);
      }
    } catch (err) {
      console.error("Erreur sync all:", err);
      setError("Erreur lors de la synchronisation complète");
    } finally {
      setIsSyncing(false);
      isSyncingRef.current = false;
    }
  }, [fetchParcours, router]);

  // Chargement initial
  useEffect(() => {
    fetchParcours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync unique au chargement
  useEffect(() => {
    if (parcours && !isLoading) {
      const timer = setTimeout(() => {
        syncNow();
      }, 2000);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcours?.id]); // Dépendance sur l'id pour ne déclencher qu'une fois par parcours

  // Auto-sync avec intervalle
  useEffect(() => {
    if (!autoSync || !parcours) return;

    intervalRef.current = setInterval(() => {
      syncNow();
    }, syncInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSync]);

  // Helpers
  const getDossierByStep = useCallback(
    (step: Step) => {
      return dossiers.find((d) => d.step === step);
    },
    [dossiers]
  );

  const getDSStatusByStep = useCallback(
    (step: Step): DSStatus | undefined => {
      return getDossierByStep(step)?.dsStatus;
    },
    [getDossierByStep]
  );

  const getCurrentDossier = useCallback(() => {
    if (!parcours) return undefined;
    return getDossierByStep(parcours.currentStep);
  }, [parcours, getDossierByStep]);

  const value = {
    // Données
    parcours,
    dossiers,

    // État actuel
    currentStep: parcours?.currentStep ?? null,
    currentStatus: parcours?.currentStatus ?? null,

    // État AMO
    statutAmo,

    // Sync DS
    lastDSStatus,
    isSyncing,
    lastSync,

    // Loading
    isLoading,
    error,

    // Calculées
    isComplete,
    prochainEtape,
    hasParcours: !!parcours,

    // Actions
    refresh: fetchParcours,
    syncNow,
    syncAll,

    // Helpers
    getDossierByStep,
    getDSStatusByStep,
    getCurrentDossier,
  };

  return (
    <ParcoursContext.Provider value={value}>
      {children}
    </ParcoursContext.Provider>
  );
}
