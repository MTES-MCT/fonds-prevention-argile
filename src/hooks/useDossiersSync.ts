import { useState, useEffect, useCallback, useRef } from "react";
import {
  syncUserDossierStatus,
  syncAllUserDossiers,
} from "@/lib/actions/demarches-simplifies/sync.actions";
import { useRouter } from "next/navigation";
import { Step } from "@/lib/parcours/parcours.types";

interface UseDossierSyncOptions {
  autoSync?: boolean;
  interval?: number; // en millisecondes
  step?: Step;
  onStatusChange?: (oldStatus: string, newStatus: string) => void;
}

interface UseDossierSyncReturn {
  isSyncing: boolean;
  lastSync: Date | null;
  lastStatus: string | null;
  syncNow: () => Promise<void>;
  syncAll: () => Promise<void>;
  error: string | null;
}

export function useDossierSync(
  options: UseDossierSyncOptions = {}
): UseDossierSyncReturn {
  const {
    autoSync = false,
    interval = 30000, // 30 secondes par défaut
    step = Step.ELIGIBILITE,
    onStatusChange,
  } = options;

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fonction de synchronisation
  const syncNow = useCallback(async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setError(null);

    try {
      const result = await syncUserDossierStatus(step);

      if (result.success && result.data) {
        setLastSync(new Date());

        // Toujours stocker le statut actuel
        setLastStatus(result.data.newStatus || result.data.oldStatus || null);

        // Si le statut a changé
        if (
          result.data.updated &&
          result.data.oldStatus &&
          result.data.newStatus
        ) {
          // Callback personnalisé
          onStatusChange?.(result.data.oldStatus, result.data.newStatus);

          // Refresh la page si nécessaire
          if (result.data.shouldRefresh) {
            router.refresh();
          }
        }
      } else if (!result.success) {
        setError(result.error || "Erreur de synchronisation");
      }
    } catch (err) {
      console.error("Erreur sync:", err);
      setError("Erreur lors de la synchronisation");
    } finally {
      setIsSyncing(false);
    }
  }, [step, isSyncing, router, onStatusChange]);

  // Fonction de synchronisation complète
  const syncAll = useCallback(async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setError(null);

    try {
      const result = await syncAllUserDossiers();

      if (result.success && result.data) {
        setLastSync(new Date());

        // Refresh si au moins un dossier a été mis à jour
        if (result.data.totalUpdated > 0) {
          router.refresh();
        }
      } else if (!result.success) {
        setError(result.error || "Erreur de synchronisation");
      }
    } catch (err) {
      console.error("Erreur sync all:", err);
      setError("Erreur lors de la synchronisation complète");
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, router]);

  // Auto-sync avec intervalle
  useEffect(() => {
    if (!autoSync) return;

    // Sync immédiate au montage
    syncNow();

    // Setup de l'intervalle
    intervalRef.current = setInterval(syncNow, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoSync, interval, syncNow]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isSyncing,
    lastSync,
    lastStatus,
    syncNow,
    syncAll,
    error,
  };
}
