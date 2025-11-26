"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ParcoursContext } from "./ParcoursContext";
import type { StatutValidationAmo } from "../../amo/domain/value-objects";
import type { ValidationAmoComplete } from "../../amo/domain/entities";
import type { DSStatus } from "../../dossiers-ds/domain/value-objects/ds-status";
import type { Parcours, Step } from "../domain";
import { obtenirMonParcours } from "../actions";
import { getValidationAmo } from "../../amo/actions";
import { syncAllUserDossiers, syncUserDossierStatus } from "../../dossiers-ds/actions/dossier-sync.actions";
import { DossierDS } from "../../dossiers-ds";
import { ROLES, useAuth } from "@/features/auth/client";
import { createDebugLogger } from "@/shared/utils";

interface ParcoursProviderProps {
  children: React.ReactNode;
  autoSync?: boolean;
  syncInterval?: number;
}

const debug = createDebugLogger("PARCOURS_PROVIDER");

export function ParcoursProvider({ children, autoSync = false, syncInterval = 300000 }: ParcoursProviderProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  // État principal
  const [parcours, setParcours] = useState<Parcours | null>(null);
  const [dossiers, setDossiers] = useState<DossierDS[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // État AMO
  const [statutAmo, setStatutAmo] = useState<StatutValidationAmo | null>(null);
  const [validationAmoComplete, setValidationAmoComplete] = useState<ValidationAmoComplete | null>(null);

  // État de synchronisation
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [lastDSStatus, setLastDSStatus] = useState<DSStatus | null>(null);

  // Données calculées
  const [isComplete, setIsComplete] = useState(false);
  const [prochainEtape, setProchainEtape] = useState<Step | null>(null);

  // Refs pour éviter les appels multiples
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);
  const hasFetchedRef = useRef(false);
  const hasInitialSyncRef = useRef(false);

  // Fonction de chargement du parcours (stabilisée)
  const fetchParcours = useCallback(async () => {
    debug.log("[fetchParcours] Start", {
      isAuthenticated,
      role: user?.role,
      hasFetched: hasFetchedRef.current,
    });

    // Si non authentifié OU si admin, skip
    if (!isAuthenticated || user?.role === ROLES.ADMIN) {
      debug.log("[fetchParcours] Skip - not auth or admin");
      setIsLoading(false);
      hasFetchedRef.current = true;
      return;
    }

    // Éviter les appels multiples pendant un chargement
    if (hasFetchedRef.current) {
      debug.log("[fetchParcours] Skip - already fetched");
      return;
    }

    hasFetchedRef.current = true;
    debug.log("[fetchParcours] Fetching...");

    try {
      setError(null);
      const result = await obtenirMonParcours();
      debug.log("[fetchParcours] obtenirMonParcours result:", result.success);

      if (result.success && result.data) {
        setParcours(result.data.parcours);
        setDossiers(result.data.dossiers);
        setIsComplete(result.data.isComplete);
        setProchainEtape(result.data.prochainEtape);

        const currentDossier = result.data.dossiers.find((d) => d.demarcheEtape === result.data.parcours.currentStep);
        if (currentDossier) {
          setLastDSStatus(currentDossier.etatDs as DSStatus);
        }

        debug.log("[fetchParcours] Fetching AMO validation...");
        // Récupérer le statut AMO
        const validationResult = await getValidationAmo();
        debug.log("[fetchParcours] getValidationAmo result:", validationResult.success);

        if (validationResult.success && validationResult.data) {
          setStatutAmo(validationResult.data.statut);
          setValidationAmoComplete(validationResult.data);
          debug.log("[fetchParcours] AMO statut set:", validationResult.data.statut);
        } else {
          setStatutAmo(null);
          setValidationAmoComplete(null);
          debug.log("[fetchParcours] No AMO validation data");
        }

        debug.log("[fetchParcours] Complete");
      } else {
        const errorMessage = !result.success && result.error ? result.error : "Impossible de récupérer le parcours";
        setError(errorMessage);
        console.error("[fetchParcours] Error:", errorMessage);
      }
    } catch (err) {
      console.error("[fetchParcours] Exception:", err);
      setError("Erreur lors du chargement");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.role]);

  // Refresh : permet de forcer un nouveau fetch
  const refreshParcours = useCallback(async () => {
    hasFetchedRef.current = false;
    await fetchParcours();
  }, [fetchParcours]);

  // Fonction de synchronisation
  const syncNow = useCallback(
    async (step?: Step) => {
      if (isSyncingRef.current) return;

      isSyncingRef.current = true;
      setIsSyncing(true);
      setError(null);

      try {
        const targetStep = step || parcours?.currentStep;
        if (!targetStep) return;

        const result = await syncUserDossierStatus(targetStep);

        if (result.success && result.data) {
          setLastSync(new Date());

          if (result.data.newStatus) {
            setLastDSStatus(result.data.newStatus as DSStatus);
          }

          if (result.data.updated) {
            await refreshParcours();
            router.refresh();
          }
        } else {
          const errorMessage = !result.success && result.error ? result.error : "Erreur de synchronisation";
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
    [parcours?.currentStep, refreshParcours, router]
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
          await refreshParcours();
          router.refresh();
        }
      } else {
        const errorMessage = !result.success && result.error ? result.error : "Erreur de synchronisation complète";
        setError(errorMessage);
      }
    } catch (err) {
      console.error("Erreur sync all:", err);
      setError("Erreur lors de la synchronisation complète");
    } finally {
      setIsSyncing(false);
      isSyncingRef.current = false;
    }
  }, [refreshParcours, router]);

  // ============================================
  // INITIALISATION - Parcours utilisateur
  // ============================================
  useEffect(() => {
    debug.log("[ParcoursProvider] INIT PARCOURS - Start", {
      isAuthenticated,
      role: user?.role,
      hasFetched: hasFetchedRef.current,
    });

    // Guard : éviter les appels multiples
    if (hasFetchedRef.current) {
      debug.log("[ParcoursProvider] INIT PARCOURS - Skip (already fetched)");
      return;
    }

    // Cas 1 : Utilisateur authentifié et non-admin → charger le parcours
    if (isAuthenticated && user?.role !== ROLES.ADMIN) {
      debug.log("[ParcoursProvider] INIT PARCOURS - Fetching parcours (user authenticated)");
      fetchParcours();
    }
    // Cas 2 : Utilisateur non authentifié (ou admin) → pas de parcours à charger
    else if (isAuthenticated === false || user?.role === ROLES.ADMIN) {
      debug.log("[ParcoursProvider] INIT PARCOURS - Skip (not authenticated or admin)");
      setIsLoading(false);
    }
    // Cas 3 : isAuthenticated === undefined → en attente de la détermination de l'auth
    else {
      debug.log("[ParcoursProvider] INIT PARCOURS - Waiting for auth determination...");
    }
  }, [isAuthenticated, user?.role, fetchParcours]);

  // ============================================
  // SYNC INITIAL : STATUTS DÉMARCHES SIMPLIFIÉES
  // ============================================
  useEffect(() => {
    debug.log("[ParcoursProvider] SYNC INITIAL - Check", {
      hasInitialSync: hasInitialSyncRef.current,
      isAuthenticated,
      role: user?.role,
      hasParcours: !!parcours,
      isSyncing: isSyncingRef.current,
    });

    // Guard : éviter les syncs multiples
    if (hasInitialSyncRef.current) {
      debug.log("[ParcoursProvider] SYNC INITIAL - Skip (already synced)");
      return;
    }

    // Sync uniquement si authentifié, pas admin, et parcours existant
    if (isAuthenticated && user?.role !== ROLES.ADMIN && parcours && !isSyncingRef.current) {
      hasInitialSyncRef.current = true;
      debug.log("[ParcoursProvider] SYNC INITIAL - Scheduling sync in 2s...");

      const timer = setTimeout(() => {
        debug.log("[ParcoursProvider] SYNC INITIAL - Executing sync now");
        syncNow();
      }, 2000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [isAuthenticated, user?.role, parcours, syncNow]);

  // ============================================
  // AUTO-SYNC : SYNCHRONISATION PÉRIODIQUE
  // ============================================
  useEffect(() => {
    debug.log("[ParcoursProvider] AUTO-SYNC - Check", {
      autoSync,
      isAuthenticated,
      role: user?.role,
      hasParcours: !!parcours,
      syncInterval,
    });

    // Auto-sync uniquement si activé et utilisateur authentifié non-admin
    if (!autoSync || !isAuthenticated || user?.role === ROLES.ADMIN || !parcours) {
      debug.log("[ParcoursProvider] AUTO-SYNC - Disabled");
      return;
    }

    debug.log("[ParcoursProvider] AUTO-SYNC - Setting up interval");
    intervalRef.current = setInterval(() => {
      debug.log("[ParcoursProvider] AUTO-SYNC - Executing sync");
      syncNow();
    }, syncInterval);

    return () => {
      if (intervalRef.current) {
        debug.log("[ParcoursProvider] AUTO-SYNC - Clearing interval");
        clearInterval(intervalRef.current);
      }
    };
  }, [autoSync, isAuthenticated, user?.role, parcours, syncNow, syncInterval]);

  // Helpers
  const getDossierByStep = useCallback(
    (step: Step) => {
      return dossiers.find((d) => d.demarcheEtape === step);
    },
    [dossiers]
  );

  const getDSStatusByStep = useCallback(
    (step: Step): DSStatus | undefined => {
      return getDossierByStep(step)?.etatDs as DSStatus | undefined;
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
    currentStatus: parcours?.status ?? null,

    // État AMO
    statutAmo,
    validationAmoComplete,

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
    refresh: refreshParcours,
    syncNow,
    syncAll,

    // Helpers
    getDossierByStep,
    getDSStatusByStep,
    getCurrentDossier,
  };

  return <ParcoursContext.Provider value={value}>{children}</ParcoursContext.Provider>;
}
