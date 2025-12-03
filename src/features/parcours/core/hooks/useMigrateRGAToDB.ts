"use client";

import { useEffect, useRef } from "react";
import { useRGAStore } from "@/features/simulateur-rga";
import { useAuth } from "@/features/auth/client";
import { useParcours } from "../context/useParcours";
import { migrateSimulationDataToDatabase } from "../actions/parcours-simulateur-rga-migration.actions";
import type { RGAFormData } from "@/features/simulateur-rga";
import { createDebugLogger } from "@/shared/utils";

const debug = createDebugLogger("MIGRATE_RGA");

/**
 * Hook pour migrer les données RGA du localStorage vers la BDD
 *
 * Scénario :
 * 1. Utilisateur remplit le simulateur → données en Zustand (localStorage)
 * 2. Utilisateur se connecte via FranceConnect
 * 3. Ce hook détecte les données + authentification + parcours
 * 4. Migration vers la BDD
 * 5. Attendre que parcours.rgaSimulationData soit chargé
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

  // Migration des données RGA vers la BDD (sans nettoyage)
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
        debug.log("[MigrationRGAtoDB] Skip - already migrated");
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

      // Déjà des données en BDD
      if (parcours.rgaSimulationData) {
        debug.log("[MigrationRGAtoDB] Skip - data already in DB");
        hasMigratedRef.current = true;
        // Note : le nettoyage sera fait par l'effet 2
        return;
      }

      // Lancer la migration
      isMigratingRef.current = true;
      debug.log("[MigrationRGAtoDB] Starting migration...");

      try {
        const result = await migrateSimulationDataToDatabase(tempRgaData as RGAFormData);

        if (result.success) {
          debug.log("[MigrationRGAtoDB] Migration successful");

          // Rafraîchir le parcours pour récupérer les données migrées
          await refresh();

          hasMigratedRef.current = true;
          debug.log("[MigrationRGAtoDB] Parcours refresh triggered, waiting for rgaSimulationData...");
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
    // 1. Migration effectuée
    // 2. Données présentes en base (parcours.rgaSimulationData existe)
    // 3. Pas encore nettoyé
    if (hasMigratedRef.current && parcours?.rgaSimulationData && !hasCleanedRef.current) {
      debug.log("[Cleanup] Nettoyage localStorage (données confirmées en base)");
      clearRGA();
      hasCleanedRef.current = true;
      debug.log("[Cleanup] localStorage cleaned");
    }
  }, [parcours?.rgaSimulationData, clearRGA]);

  // Nettoyage initial si données déjà en base au démarrage
  useEffect(() => {
    // Si au démarrage on a déjà des données en base ET du tempRgaData
    // (cas d'un refresh de page après migration)
    if (
      isHydrated &&
      isAuthenticated &&
      parcours?.rgaSimulationData &&
      tempRgaData &&
      !hasCleanedRef.current &&
      !isMigratingRef.current
    ) {
      debug.log("[Cleanup] Nettoyage localStorage (données déjà en base au démarrage)");
      clearRGA();
      hasCleanedRef.current = true;
      hasMigratedRef.current = true; // Pas besoin de migrer
      debug.log("[Cleanup] localStorage cleaned");
    }
  }, [isHydrated, isAuthenticated, parcours?.rgaSimulationData, tempRgaData, clearRGA]);
}
