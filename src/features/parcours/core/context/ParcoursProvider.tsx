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
import { PartialRGAFormData, RGAFormData } from "@/features/simulateur-rga";
import { storageAdapter } from "@/features/simulateur-rga/adapters/storage.adapter";
import { migrateSimulationDataToDatabase } from "../actions/parcours-simulateur-rga-migration.actions";
import { mapDBToRGAFormData } from "@/features/simulateur-rga/mappers";
import { decryptRGAData } from "@/features/simulateur-rga/actions/decrypt-rga-data.actions";
import { ROLES, useAuth } from "@/features/auth/client";

interface ParcoursProviderProps {
  children: React.ReactNode;
  autoSync?: boolean;
  syncInterval?: number;
}

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

  // Simulateur RGA
  const [tempRgaData, setTempRgaData] = useState<PartialRGAFormData | null>(null);

  // Refs pour éviter les appels multiples
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);
  const hasFetchedRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const hasMigratedSessionRef = useRef(false);
  const hasMigratedLocalStorageRef = useRef(false);
  const hasInitialSyncRef = useRef(false);

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

  // Fonction de chargement du parcours (stabilisée)
  const fetchParcours = useCallback(async () => {
    console.log("[fetchParcours] Start", {
      isAuthenticated,
      role: user?.role,
      hasFetched: hasFetchedRef.current,
    });

    // Si non authentifié (mode embed RGA uniquement) OU si admin, skip
    if (!isAuthenticated || user?.role === ROLES.ADMIN) {
      console.log("[fetchParcours] Skip - not auth or admin");
      setIsLoading(false);
      hasFetchedRef.current = true;
      return;
    }

    // Éviter les appels multiples pendant un chargement
    if (hasFetchedRef.current) {
      console.log("[fetchParcours] Skip - already fetched");
      return;
    }

    hasFetchedRef.current = true;
    console.log("[fetchParcours] Fetching...");

    try {
      setError(null);
      const result = await obtenirMonParcours();
      console.log("[fetchParcours] obtenirMonParcours result:", result.success);

      if (result.success && result.data) {
        setParcours(result.data.parcours);
        setDossiers(result.data.dossiers);
        setIsComplete(result.data.isComplete);
        setProchainEtape(result.data.prochainEtape);

        const currentDossier = result.data.dossiers.find((d) => d.demarcheEtape === result.data.parcours.currentStep);
        if (currentDossier) {
          setLastDSStatus(currentDossier.etatDs as DSStatus);
        }

        console.log("[fetchParcours] Fetching AMO validation...");
        // Récupérer le statut AMO
        const validationResult = await getValidationAmo();
        console.log("[fetchParcours] getValidationAmo result:", validationResult.success);

        if (validationResult.success && validationResult.data) {
          setStatutAmo(validationResult.data.statut);
          setValidationAmoComplete(validationResult.data);
          console.log("[fetchParcours] AMO statut set:", validationResult.data.statut);
        } else {
          setStatutAmo(null);
          setValidationAmoComplete(null);
          console.log("[fetchParcours] No AMO validation data");
        }

        console.log("[fetchParcours] Complete ✅");
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

  // Action RGA : nettoyage des données temporaires
  const clearTempRgaData = useCallback(() => {
    storageAdapter.clear();
    setTempRgaData(null);
  }, []);

  /**
   * Migration des données sessionStorage → BDD (ancien système)
   */
  const migrateSessionStorageToDB = useCallback(async () => {
    console.log("[migrateSessionStorageToDB] Start", {
      hasMigrated: hasMigratedSessionRef.current,
      isAuthenticated,
      hasParcours: !!parcours,
    });

    // Guard : éviter les migrations multiples
    if (hasMigratedSessionRef.current) {
      console.log("[migrateSessionStorageToDB] Skip - already migrated");
      return;
    }

    // Nécessite authentification + parcours
    if (!isAuthenticated || !parcours) {
      console.log("[migrateSessionStorageToDB] Skip - missing requirements");
      return;
    }

    // Vérifier si des données existent dans sessionStorage
    if (!storageAdapter.hasSessionStorageData()) {
      console.log("[migrateSessionStorageToDB] Skip - no sessionStorage data");
      hasMigratedSessionRef.current = true; // Marquer comme vérifié
      return;
    }

    // Vérifier si déjà des données en BDD
    if (parcours.rgaSimulationData) {
      console.log("[migrateSessionStorageToDB] Skip - data already in DB, cleaning sessionStorage");
      storageAdapter.clearSessionStorage();
      hasMigratedSessionRef.current = true;
      return;
    }

    // Récupérer les données sessionStorage
    const sessionData = storageAdapter.getFromSessionStorage();

    if (!sessionData) {
      console.log("[migrateSessionStorageToDB] Skip - no data retrieved");
      hasMigratedSessionRef.current = true;
      return;
    }

    // Marquer comme en cours avant l'appel async
    hasMigratedSessionRef.current = true;
    console.log("[migrateSessionStorageToDB] Migrating to DB...");

    try {
      const result = await migrateSimulationDataToDatabase(sessionData as RGAFormData);

      if (result.success) {
        console.log("[migrateSessionStorageToDB] Migration successful ✅");
        // Nettoyer sessionStorage après migration réussie
        storageAdapter.clearSessionStorage();

        // Rafraîchir le parcours
        await refreshParcours();
      } else {
        console.error("[migrateSessionStorageToDB] Migration failed:", result.error);
        // En cas d'échec, permettre une nouvelle tentative
        hasMigratedSessionRef.current = false;
      }
    } catch (error) {
      console.error("[migrateSessionStorageToDB] Exception:", error);
      // En cas d'erreur, permettre une nouvelle tentative
      hasMigratedSessionRef.current = false;
    }
  }, [isAuthenticated, parcours, refreshParcours]);

  /**
   * Migration localStorage → BDD après connexion
   */
  const migrateLocalStorageToDB = useCallback(async () => {
    console.log("[migrateLocalStorageToDB] Start", {
      hasMigrated: hasMigratedLocalStorageRef.current,
      isAuthenticated,
      hasParcours: !!parcours,
      hasTempRgaData: !!tempRgaData,
    });

    // Guard : éviter les migrations multiples
    if (hasMigratedLocalStorageRef.current) {
      console.log("[migrateLocalStorageToDB] Skip - already migrated");
      return;
    }

    // Nécessite authentification + parcours
    if (!isAuthenticated || !parcours) {
      console.log("[migrateLocalStorageToDB] Skip - missing requirements");
      return;
    }

    // Seulement si tempRgaData existe et pas encore en BDD
    if (!tempRgaData || parcours.rgaSimulationData) {
      console.log("[migrateLocalStorageToDB] Skip - no tempRgaData or already in DB");
      hasMigratedLocalStorageRef.current = true;
      return;
    }

    // Marquer comme en cours avant l'appel async
    hasMigratedLocalStorageRef.current = true;
    console.log("[migrateLocalStorageToDB] Migrating to DB...");

    try {
      const result = await migrateSimulationDataToDatabase(tempRgaData as RGAFormData);

      if (result.success) {
        console.log("[migrateLocalStorageToDB] Migration successful ✅");

        // Recharger le parcours depuis la BDD pour récupérer les données migrées
        console.log("[migrateLocalStorageToDB] Reloading parcours from DB...");
        hasFetchedRef.current = false; // Réinitialiser le guard pour permettre le refetch
        await fetchParcours(); // Refetch le parcours avec les données RGA maintenant en BDD

        // Nettoyer localStorage APRÈS le refetch (quand parcours.rgaSimulationData existe)
        clearTempRgaData();

        console.log("[migrateLocalStorageToDB] Migration complete, parcours reloaded");
      } else {
        console.error("[migrateLocalStorageToDB] Migration failed:", result.error);
        // En cas d'échec, permettre une nouvelle tentative
        hasMigratedLocalStorageRef.current = false;
      }
    } catch (error) {
      console.error("[migrateLocalStorageToDB] Exception:", error);
      // En cas d'erreur, permettre une nouvelle tentative
      hasMigratedLocalStorageRef.current = false;
    }
  }, [isAuthenticated, tempRgaData, parcours, clearTempRgaData, fetchParcours]);

  // ============================================
  // INITIALISATION - Données RGA
  // ============================================
  // Charge les données RGA depuis URL (embed) ou storage (localStorage/sessionStorage)
  // S'exécute une seule fois au montage du composant
  // Indépendant de l'authentification car les données RGA peuvent exister avant connexion
  useEffect(() => {
    console.log("[ParcoursProvider] INIT RGA - Start", {
      hasInitialized: hasInitializedRef.current,
    });

    // Guard : éviter la double initialisation en mode strict de React
    if (hasInitializedRef.current) {
      console.log("[ParcoursProvider] INIT RGA - Skip (already initialized)");
      return;
    }
    hasInitializedRef.current = true;

    const initializeRGAData = async () => {
      // 1. Essayer de charger depuis URL (mode embed avec données chiffrées)
      console.log("[ParcoursProvider] INIT RGA - Loading from URL...");
      const loadedFromURL = await loadRGAFromURL();
      console.log("[ParcoursProvider] INIT RGA - Loaded from URL:", loadedFromURL);

      // 2. Si pas de données dans l'URL, charger depuis storage
      if (!loadedFromURL) {
        console.log("[ParcoursProvider] INIT RGA - Loading from storage...");
        loadRGAFromStorage();
        console.log("[ParcoursProvider] INIT RGA - Storage load complete");
      }

      console.log("[ParcoursProvider] INIT RGA - Complete");
    };

    initializeRGAData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dépendances vides = exécution unique au montage

  // ============================================
  // INITIALISATION - Parcours utilisateur
  // ============================================
  // Charge le parcours utilisateur depuis la BDD
  // S'exécute quand l'authentification est déterminée (isAuthenticated passe de undefined à true/false)
  // Nécessite que l'utilisateur soit authentifié et ne soit pas admin
  useEffect(() => {
    console.log("[ParcoursProvider] INIT PARCOURS - Start", {
      isAuthenticated,
      role: user?.role,
      hasFetched: hasFetchedRef.current,
    });

    // Guard : éviter les appels multiples
    if (hasFetchedRef.current) {
      console.log("[ParcoursProvider] INIT PARCOURS - Skip (already fetched)");
      return;
    }

    // Cas 1 : Utilisateur authentifié et non-admin → charger le parcours
    if (isAuthenticated && user?.role !== ROLES.ADMIN) {
      console.log("[ParcoursProvider] INIT PARCOURS - Fetching parcours (user authenticated)");
      fetchParcours();
    }
    // Cas 2 : Utilisateur non authentifié (ou admin) → pas de parcours à charger
    // IMPORTANT : Ne PAS marquer hasFetchedRef ici car l'auth peut changer
    else if (isAuthenticated === false || user?.role === ROLES.ADMIN) {
      console.log("[ParcoursProvider] INIT PARCOURS - Skip (not authenticated or admin)");
      setIsLoading(false);
    }
    // Cas 3 : isAuthenticated === undefined → en attente de la détermination de l'auth
    else {
      console.log("[ParcoursProvider] INIT PARCOURS - Waiting for auth determination...");
    }
  }, [isAuthenticated, user?.role, fetchParcours]);

  // ============================================
  // MIGRATION : SESSION STORAGE → BDD
  // ============================================
  // Migre les anciennes données du sessionStorage (ancien système) vers la BDD
  // S'exécute après le chargement du parcours si des données sessionStorage existent
  // Ne s'exécute qu'une seule fois grâce au guard hasMigratedSessionRef
  useEffect(() => {
    console.log("[ParcoursProvider] MIGRATION SESSION - Check", {
      hasParcours: !!parcours,
      isAuthenticated,
      hasMigrated: hasMigratedSessionRef.current,
    });

    if (parcours && isAuthenticated) {
      migrateSessionStorageToDB();
    }
  }, [parcours, isAuthenticated, migrateSessionStorageToDB]);

  // ============================================
  // MIGRATION : LOCAL STORAGE → BDD
  // ============================================
  // Migre les données du localStorage vers la BDD après connexion
  // Scénario : utilisateur remplit simulateur → données en localStorage → connexion FC → migration BDD
  // S'exécute après le chargement du parcours si tempRgaData existe
  // Ne s'exécute qu'une seule fois grâce au guard hasMigratedLocalStorageRef
  useEffect(() => {
    console.log("[ParcoursProvider] MIGRATION LOCAL - Check", {
      hasParcours: !!parcours,
      isAuthenticated,
      hasTempRgaData: !!tempRgaData,
      hasMigrated: hasMigratedLocalStorageRef.current,
    });

    if (parcours && isAuthenticated && tempRgaData) {
      migrateLocalStorageToDB();
    }
  }, [parcours, isAuthenticated, tempRgaData, migrateLocalStorageToDB]);

  // ============================================
  // SYNC INITIAL : STATUTS DÉMARCHES SIMPLIFIÉES
  // ============================================
  // Synchronise les statuts des dossiers Démarches Simplifiées 2 secondes après le chargement
  // Permet de vérifier si les statuts ont changé depuis la dernière visite
  // Ne s'exécute qu'une seule fois grâce au guard hasInitialSyncRef
  useEffect(() => {
    console.log("[ParcoursProvider] SYNC INITIAL - Check", {
      hasInitialSync: hasInitialSyncRef.current,
      isAuthenticated,
      role: user?.role,
      hasParcours: !!parcours,
      isSyncing: isSyncingRef.current,
    });

    // Guard : éviter les syncs multiples
    if (hasInitialSyncRef.current) {
      console.log("[ParcoursProvider] SYNC INITIAL - Skip (already synced)");
      return;
    }

    // Sync uniquement si authentifié, pas admin, et parcours existant
    if (isAuthenticated && user?.role !== ROLES.ADMIN && parcours && !isSyncingRef.current) {
      hasInitialSyncRef.current = true;
      console.log("[ParcoursProvider] SYNC INITIAL - Scheduling sync in 2s...");

      const timer = setTimeout(() => {
        console.log("[ParcoursProvider] SYNC INITIAL - Executing sync now");
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
  // Synchronise automatiquement les statuts DS à intervalle régulier (par défaut 5 minutes)
  // Activé uniquement si autoSync=true dans les props du Provider
  // Permet de garder les données à jour sans que l'utilisateur rafraîchisse la page
  useEffect(() => {
    console.log("[ParcoursProvider] AUTO-SYNC - Check", {
      autoSync,
      isAuthenticated,
      role: user?.role,
      hasParcours: !!parcours,
      syncInterval,
    });

    // Auto-sync uniquement si activé et utilisateur authentifié non-admin
    if (!autoSync || !isAuthenticated || user?.role === ROLES.ADMIN || !parcours) {
      console.log("[ParcoursProvider] AUTO-SYNC - Disabled");
      return;
    }

    console.log("[ParcoursProvider] AUTO-SYNC - Setting up interval");
    intervalRef.current = setInterval(() => {
      console.log("[ParcoursProvider] AUTO-SYNC - Executing sync");
      syncNow();
    }, syncInterval);

    return () => {
      if (intervalRef.current) {
        console.log("[ParcoursProvider] AUTO-SYNC - Clearing interval");
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

  // Getter RGA : converti en format uniforme
  const rgaData = parcours?.rgaSimulationData ? mapDBToRGAFormData(parcours.rgaSimulationData) : tempRgaData;

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
