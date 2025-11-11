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
import {
  syncAllUserDossiers,
  syncUserDossierStatus,
} from "../../dossiers-ds/actions/dossier-sync.actions";
import { DossierDS } from "../../dossiers-ds";
import { PartialRGAFormData, RGAFormData } from "@/features/simulateur-rga";
import { storageAdapter } from "@/features/simulateur-rga/adapters/storage.adapter";
import { migrateSimulationDataToDatabase } from "../actions/parcours-simulateur-rga-migration.actions";
import { mapDBToRGAFormData } from "@/features/simulateur-rga/mappers";
import { decryptRGAData } from "@/features/simulateur-rga/actions/decrypt-rga-data.actions";
import { useAuth } from "@/features/auth/client";

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
  const { isAuthenticated } = useAuth();

  // État principal
  const [parcours, setParcours] = useState<Parcours | null>(null);
  const [dossiers, setDossiers] = useState<DossierDS[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // État AMO
  const [statutAmo, setStatutAmo] = useState<StatutValidationAmo | null>(null);
  const [validationAmoComplete, setValidationAmoComplete] =
    useState<ValidationAmoComplete | null>(null);

  // État de synchronisation
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [lastDSStatus, setLastDSStatus] = useState<DSStatus | null>(null);

  // Données calculées
  const [isComplete, setIsComplete] = useState(false);
  const [prochainEtape, setProchainEtape] = useState<Step | null>(null);

  // Simulateur RGA
  const [tempRgaData, setTempRgaData] = useState<PartialRGAFormData | null>(
    null
  );

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  /**
   * Charge les données RGA depuis l'URL (mode embed avec chiffrement)
   * @returns true si des données ont été trouvées et chargées
   */
  const loadRGAFromURL = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;

    const hash = window.location.hash;

    if (!hash.startsWith("#d=")) {
      return false;
    }

    const encrypted = hash.replace("#d=", "");

    try {
      const result = await decryptRGAData(encrypted);

      if (result.success && result.data) {
        // Sauvegarder en localStorage (on est hors iframe maintenant)
        storageAdapter.save(result.data);
        setTempRgaData(result.data);

        // Nettoyer l'URL immédiatement
        window.history.replaceState({}, "", window.location.pathname);

        return true;
      } else if (!result.success) {
        console.error("[RGA] - Échec déchiffrement:", result.error);
        return false;
      } else {
        return false;
      }
    } catch (error) {
      console.error("[RGA] - Erreur déchiffrement:", error);
      return false;
    }
  }, []);

  /**
   * Charge les données RGA depuis le storage (localStorage/sessionStorage)
   */
  const loadRGAFromStorage = useCallback(() => {
    const stored = storageAdapter.get();

    if (stored) {
      setTempRgaData(stored);
    }
  }, []);

  // Fonction de chargement du parcours
  const fetchParcours = useCallback(async () => {
    // Si non authentifié, skip (mode embed RGA uniquement)
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const result = await obtenirMonParcours();

      if (result.success && result.data) {
        setParcours(result.data.parcours);
        setDossiers(result.data.dossiers);
        setIsComplete(result.data.isComplete);
        setProchainEtape(result.data.prochainEtape);

        const currentDossier = result.data.dossiers.find(
          (d) => d.demarcheEtape === result.data.parcours.currentStep
        );
        if (currentDossier) {
          setLastDSStatus(currentDossier.etatDs as DSStatus);
        }

        // Récupérer le statut AMO
        const validationResult = await getValidationAmo();
        if (validationResult.success && validationResult.data) {
          setStatutAmo(validationResult.data.statut);
          setValidationAmoComplete(validationResult.data);
        } else {
          setStatutAmo(null);
          setValidationAmoComplete(null);
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
  }, [isAuthenticated]);

  // Fonction de synchronisation stabilisée
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
            await fetchParcours();
            router.refresh();
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

  // Action RGA : sauvegarde temporaire
  const saveTempRgaData = useCallback((data: PartialRGAFormData): boolean => {
    try {
      const success = storageAdapter.save(data);
      if (success) {
        setTempRgaData(data);
      }
      return success;
    } catch (error) {
      console.error("[RGA] Erreur sauvegarde:", error);
      return false;
    }
  }, []);

  const clearTempRgaData = useCallback(() => {
    storageAdapter.clear();
    setTempRgaData(null);
  }, []);

  /**
   * Migration des données sessionStorage → BDD (ancien système)
   */
  const migrateSessionStorageToDB = useCallback(async () => {
    // Nécessite authentification + parcours
    if (!isAuthenticated || !parcours) {
      return;
    }

    // Vérifier si des données existent dans sessionStorage
    if (!storageAdapter.hasSessionStorageData()) {
      return;
    }

    // Vérifier si déjà des données en BDD
    if (parcours.rgaSimulationData) {
      storageAdapter.clearSessionStorage();
      return;
    }

    // Récupérer les données sessionStorage
    const sessionData = storageAdapter.getFromSessionStorage();

    if (!sessionData) {
      return;
    }

    try {
      const result = await migrateSimulationDataToDatabase(
        sessionData as RGAFormData
      );

      if (result.success) {
        // Nettoyer sessionStorage après migration réussie
        storageAdapter.clearSessionStorage();

        // Rafraîchir le parcours
        await fetchParcours();
      } else {
        console.error("[Migration sessionStorage] - Échec:", result.error);
      }
    } catch (error) {
      console.error("[Migration sessionStorage] - Erreur:", error);
    }
  }, [isAuthenticated, parcours, fetchParcours]); // ✅ Ajouter fetchParcours

  /**
   * Migration localStorage → BDD après connexion
   */
  const migrateLocalStorageToDB = useCallback(async () => {
    // Nécessite authentification + parcours
    if (!isAuthenticated || !parcours) {
      return;
    }

    // Seulement si tempRgaData existe et pas encore en BDD
    if (!tempRgaData || parcours.rgaSimulationData) {
      return;
    }

    try {
      const result = await migrateSimulationDataToDatabase(
        tempRgaData as RGAFormData
      );

      if (result.success) {
        clearTempRgaData();
        await fetchParcours();
      } else {
        console.error("[Migration localStorage] - Échec:", result.error);
      }
    } catch (error) {
      console.error("[Migration localStorage] - Erreur:", error);
    }
  }, [isAuthenticated, tempRgaData, parcours, clearTempRgaData, fetchParcours]);

  // Chargement initial : URL → storage → parcours
  useEffect(() => {
    const initializeData = async () => {
      // 1. Essayer de charger depuis URL (mode embed chiffré)
      const loadedFromURL = await loadRGAFromURL();

      // 2. Si pas d'URL, charger depuis storage
      if (!loadedFromURL) {
        loadRGAFromStorage();
      }

      // 3. Charger le parcours
      await fetchParcours();
    };

    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Migration sessionStorage → BDD (ancien système)
  useEffect(() => {
    migrateSessionStorageToDB();
  }, [migrateSessionStorageToDB]);

  // Migration localStorage → BDD après connexion
  useEffect(() => {
    migrateLocalStorageToDB();
  }, [migrateLocalStorageToDB]);

  // Sync unique au chargement
  useEffect(() => {
    // Sync uniquement si authentifié et parcours existant
    if (isAuthenticated && parcours) {
      const timer = setTimeout(() => {
        syncNow();
      }, 2000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [isAuthenticated, parcours, syncNow]);

  // Auto-sync avec intervalle
  useEffect(() => {
    // Auto-sync uniquement si authentifié
    if (!autoSync || !isAuthenticated || !parcours) return;

    intervalRef.current = setInterval(() => {
      syncNow();
    }, syncInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSync, isAuthenticated]);

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

  // Getter RGA : converti en format uniforme
  const rgaData = parcours?.rgaSimulationData
    ? mapDBToRGAFormData(parcours.rgaSimulationData)
    : tempRgaData;

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

    // RGA
    tempRgaData,
    rgaData,
    saveTempRgaData,
    clearTempRgaData,

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
