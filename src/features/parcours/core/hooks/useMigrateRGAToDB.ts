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
 * 5. Nettoyage du localStorage
 */
export function useMigrateRGAToDB() {
  const { isAuthenticated } = useAuth();
  const { parcours, refresh } = useParcours();

  // Accès direct au store Zustand
  const tempRgaData = useRGAStore((state) => state.tempRgaData);
  const clearRGA = useRGAStore((state) => state.clearRGA);
  const isHydrated = useRGAStore((state) => state.isHydrated);

  // Guard pour éviter les migrations multiples
  const hasMigratedRef = useRef(false);
  const isMigratingRef = useRef(false);

  useEffect(() => {
    const migrate = async () => {
      debug.log("[useMigrateRGAToDB] Check", {
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
        debug.log("[useMigrateRGAToDB] Skip - already migrated");
        return;
      }

      if (isMigratingRef.current) {
        debug.log("[useMigrateRGAToDB] Skip - migration in progress");
        return;
      }

      // Attendre l'hydratation Zustand
      if (!isHydrated) {
        debug.log("[useMigrateRGAToDB] Skip - not hydrated yet");
        return;
      }

      // Nécessite authentification + parcours
      if (!isAuthenticated || !parcours) {
        debug.log("[useMigrateRGAToDB] Skip - not authenticated or no parcours");
        return;
      }

      // Pas de données temporaires à migrer
      if (!tempRgaData) {
        debug.log("[useMigrateRGAToDB] Skip - no temp RGA data");
        hasMigratedRef.current = true; // Marquer comme vérifié
        return;
      }

      // Déjà des données en BDD
      if (parcours.rgaSimulationData) {
        debug.log("[useMigrateRGAToDB] Skip - data already in DB, cleaning localStorage");
        clearRGA();
        hasMigratedRef.current = true;
        return;
      }

      // Lancer la migration
      isMigratingRef.current = true;
      debug.log("[useMigrateRGAToDB] Starting migration...");

      try {
        const result = await migrateSimulationDataToDatabase(tempRgaData as RGAFormData);

        if (result.success) {
          debug.log("[useMigrateRGAToDB] Migration successful");

          // Nettoyer le localStorage
          clearRGA();

          // Rafraîchir le parcours pour récupérer les données migrées
          await refresh();

          hasMigratedRef.current = true;
          debug.log("[useMigrateRGAToDB] Migration complete");
        } else {
          console.error("[useMigrateRGAToDB] Migration failed:", result.error);
          // Permettre une nouvelle tentative
          isMigratingRef.current = false;
        }
      } catch (error) {
        console.error("[useMigrateRGAToDB] Exception:", error);
        // Permettre une nouvelle tentative
        isMigratingRef.current = false;
      }
    };

    migrate();
  }, [isHydrated, isAuthenticated, parcours, tempRgaData, clearRGA, refresh]);
}
