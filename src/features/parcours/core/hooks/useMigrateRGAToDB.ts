"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/features/auth/client";
import { useParcours } from "../context/useParcours";
import { migrateSimulationDataToDatabase } from "../actions/parcours-simulateur-rga-migration.actions";
import { createDebugLogger } from "@/shared/utils";
import { RGASimulationData, useRGAStore } from "@/features/simulateur";

const debug = createDebugLogger("MIGRATE_RGA");

/**
 * Hook pour migrer les données RGA du localStorage vers la BDD
 *
 * Scénario :
 * 1. Utilisateur remplit le simulateur → données en Zustand (localStorage)
 * 2. Utilisateur se connecte via FranceConnect
 * 3. Ce hook détecte les données + authentification + parcours
 * 4. Migration vers la BDD (écrase l'ancienne simulation si existante)
 * 5. Attendre que parcours.rgaSimulationData soit mis à jour
 * 6. Nettoyage du localStorage
 *
 * IMPORTANT : Le nettoyage est différé pour éviter le flash pendant le rechargement
 */
export function useMigrateRGAToDB() {
  const { isAuthenticated } = useAuth();
  const { parcours, refresh } = useParcours();

  // Accès direct au store Zustand
  const tempRgaData = useRGAStore((state) => state.tempRgaData);
  const clearRGA = useRGAStore((state) => state.clearRGA);
  const isHydrated = useRGAStore((state) => state.isHydrated);

  // Guards pour éviter les migrations/nettoyages multiples
  const hasMigratedRef = useRef(false);
  const isMigratingRef = useRef(false);
  const hasCleanedRef = useRef(false);

  // Stocker le timestamp des données migrées pour détecter la mise à jour
  const migratedDataTimestampRef = useRef<string | null>(null);

  // Migration des données RGA vers la BDD
  useEffect(() => {
    const migrate = async () => {
      debug.log("[MigrationRGAtoDB] Check", {
        isHydrated,
        isAuthenticated,
        hasParcours: !!parcours,
        hasTempRgaData: !!tempRgaData,
        hasRgaInDB: !!parcours?.rgaSimulationData,
        hasMigrated: hasMigratedRef.current,
        isMigrating: isMigratingRef.current,
      });

      // Guards
      if (hasMigratedRef.current) {
        debug.log("[MigrationRGAtoDB] Skip - already migrated this session");
        return;
      }

      if (isMigratingRef.current) {
        debug.log("[MigrationRGAtoDB] Skip - migration in progress");
        return;
      }

      // Attendre l'hydratation Zustand
      if (!isHydrated) {
        debug.log("[MigrationRGAtoDB] Skip - not hydrated yet");
        return;
      }

      // Nécessite authentification + parcours
      if (!isAuthenticated || !parcours) {
        debug.log("[MigrationRGAtoDB] Skip - not authenticated or no parcours");
        return;
      }

      // Pas de données temporaires à migrer
      if (!tempRgaData) {
        debug.log("[MigrationRGAtoDB] Skip - no temp RGA data");
        hasMigratedRef.current = true; // Marquer comme vérifié
        return;
      }

      // Lancer la migration (écrase l'ancienne simulation si existante)
      isMigratingRef.current = true;
      debug.log("[MigrationRGAtoDB] Starting migration...", {
        hasExistingData: !!parcours.rgaSimulationData,
      });

      try {
        const result = await migrateSimulationDataToDatabase(tempRgaData as RGASimulationData);

        if (result.success) {
          debug.log("[MigrationRGAtoDB] Migration successful");

          // Stocker un identifiant pour détecter quand le refresh est terminé
          migratedDataTimestampRef.current = new Date().toISOString();

          // Rafraîchir le parcours pour récupérer les données migrées
          await refresh();

          hasMigratedRef.current = true;
          debug.log("[MigrationRGAtoDB] Parcours refresh triggered, waiting for rgaSimulationData update...");
        } else {
          console.error("[MigrationRGAtoDB] Failed:", result.error);
          // Permettre une nouvelle tentative
          isMigratingRef.current = false;
        }
      } catch (error) {
        console.error("[MigrationRGAtoDB] Exception:", error);
        // Permettre une nouvelle tentative
        isMigratingRef.current = false;
      }
    };

    migrate();
  }, [isHydrated, isAuthenticated, parcours, tempRgaData, refresh]);

  // Nettoyage du localStorage après confirmation des données en BDD
  useEffect(() => {
    // Conditions pour nettoyer :
    // 1. Migration effectuée cette session
    // 2. Données présentes en base (parcours.rgaSimulationData existe)
    // 3. Pas encore nettoyé
    if (hasMigratedRef.current && parcours?.rgaSimulationData && !hasCleanedRef.current) {
      debug.log("[Cleanup] Nettoyage localStorage (données confirmées en base)");
      clearRGA();
      hasCleanedRef.current = true;
      debug.log("[Cleanup] localStorage cleaned");
    }
  }, [parcours?.rgaSimulationData, clearRGA]);
}
