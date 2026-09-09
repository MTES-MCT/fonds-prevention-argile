"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/features/auth/client";
import { useParcours } from "../context/useParcours";
import { migrateSimulationDataToDatabase } from "../actions/parcours-simulateur-rga-migration.actions";
import { enregistrerSimulationDemandeurAction } from "../actions/enregistrer-simulation-demandeur.actions";
import { createDebugLogger } from "@/shared/utils";
import { RGASimulationData, useRGAStore } from "@/features/simulateur";
import { comparerSimulations } from "@/features/simulateur/domain/services/comparaison-simulations.service";
import { isSameSimulationContent } from "../utils/simulation-comparison";
import { peutModifierSaSimulation } from "../domain/value-objects/edition-simulation";
import { Step } from "../domain";

const debug = createDebugLogger("MIGRATE_RGA");

/**
 * Rattache au compte la simulation faite avant connexion.
 *
 * Quatre issues, selon ce que le compte connaît déjà :
 * 1. aucune simulation → migration silencieuse (cas nominal) ;
 * 2. la même simulation → rien à faire, on purge le cache local ;
 * 3. une simulation différente → **arbitrage du demandeur** : on n'écrase plus en
 *    silence un dossier existant, il choisit la version à conserver (ADR-0036) ;
 * 4. idem mais la simulation du compte est verrouillée (correction d'agent, formulaire
 *    chez la DDT) → aucun choix à proposer, la version du compte reste.
 */
export function useMigrateRGAToDB() {
  const { isAuthenticated } = useAuth();
  const { parcours, refresh, getDSStatusByStep } = useParcours();

  const tempRgaData = useRGAStore((state) => state.tempRgaData);
  const clearRGA = useRGAStore((state) => state.clearRGA);
  const isHydrated = useRGAStore((state) => state.isHydrated);

  // Guards pour éviter les migrations/nettoyages multiples
  const hasMigratedRef = useRef(false);
  const isMigratingRef = useRef(false);
  const hasCleanedRef = useRef(false);
  // Un seul rattrapage : sans ce garde-fou, un désaccord persistant entre l'état
  // client et le serveur ferait boucler action -> refresh -> action.
  const hasResyncedRef = useRef(false);

  const [isResolving, setIsResolving] = useState(false);

  const simulationActive = parcours?.rgaSimulationData ?? null;

  const arbitrage = useMemo(() => {
    if (!isHydrated || !isAuthenticated || !parcours || !tempRgaData || !simulationActive) return null;
    if (isSameSimulationContent(simulationActive, tempRgaData as RGASimulationData)) return null;

    // Verrouillée, la simulation du compte n'est pas remplaçable : proposer le choix
    // reviendrait à le faire refuser côté serveur juste après.
    const verrouille = !peutModifierSaSimulation({
      simulationCorrigeeParAgent: parcours.simulationCorrigeeParAgent,
      eligibiliteDsStatus: getDSStatusByStep(Step.ELIGIBILITE) ?? null,
    });
    if (verrouille) return { verrouille: true } as const;

    const comparaison = comparerSimulations(simulationActive, tempRgaData);
    if (comparaison.identiques) return null;

    return { verrouille: false, comparaison, active: simulationActive, candidate: tempRgaData } as const;
  }, [isHydrated, isAuthenticated, parcours, tempRgaData, simulationActive, getDSStatusByStep]);

  const marquerTermine = useCallback(() => {
    clearRGA();
    hasMigratedRef.current = true;
    hasCleanedRef.current = true;
  }, [clearRGA]);

  // Migration des données RGA vers la BDD
  useEffect(() => {
    const migrate = async () => {
      debug.log("[MigrationRGAtoDB] Check", {
        isHydrated,
        isAuthenticated,
        hasParcours: !!parcours,
        hasTempRgaData: !!tempRgaData,
        hasRgaInDB: !!simulationActive,
        arbitrage: arbitrage ? (arbitrage.verrouille ? "verrouille" : "a-trancher") : "aucun",
        hasMigrated: hasMigratedRef.current,
        isMigrating: isMigratingRef.current,
      });

      if (hasMigratedRef.current || isMigratingRef.current) return;
      if (!isHydrated) return;
      if (!isAuthenticated || !parcours) return;

      if (!tempRgaData) {
        hasMigratedRef.current = true; // Marquer comme vérifié
        return;
      }

      // Verrouillé : la version du compte reste, le cache local n'a plus d'usage.
      if (arbitrage?.verrouille) {
        debug.log("[MigrationRGAtoDB] Simulation verrouillée — cache local abandonné");
        marquerTermine();
        return;
      }

      // L'arbitrage attend une réponse du demandeur : ne rien écrire entre-temps.
      if (arbitrage) {
        debug.log("[MigrationRGAtoDB] Conflit — arbitrage demandé au demandeur");
        return;
      }

      isMigratingRef.current = true;

      try {
        const result = await migrateSimulationDataToDatabase(tempRgaData as RGASimulationData);

        if (result.success && result.data.enregistree) {
          await refresh();
          hasMigratedRef.current = true;
          return;
        }

        // `enregistree: false` : le serveur voit une simulation que l'état client
        // ignore encore. Un refresh suffit à révéler l'arbitrage ; s'il n'y parvient
        // pas, on s'arrête là plutôt que de boucler.
        if (result.success) {
          isMigratingRef.current = false;
          if (!hasResyncedRef.current) {
            hasResyncedRef.current = true;
            await refresh();
          } else {
            hasMigratedRef.current = true;
          }
          return;
        }

        console.error("[MigrationRGAtoDB] Failed:", result.error);
        isMigratingRef.current = false;
      } catch (error) {
        console.error("[MigrationRGAtoDB] Exception:", error);
        isMigratingRef.current = false;
      }
    };

    migrate();
  }, [isHydrated, isAuthenticated, parcours, tempRgaData, refresh, arbitrage, simulationActive, marquerTermine]);

  /**
   * Tranche l'arbitrage. « Version active » n'écrit rien : la simulation du compte
   * est déjà la bonne, seul le cache local est à jeter.
   */
  const resoudreConflit = useCallback(
    async (choix: "active" | "candidate") => {
      if (choix === "active") {
        marquerTermine();
        return;
      }

      if (!tempRgaData) return;
      setIsResolving(true);
      try {
        const result = await enregistrerSimulationDemandeurAction(tempRgaData as RGASimulationData);
        if (!result.success) {
          console.error("[MigrationRGAtoDB] Arbitrage échoué:", result.error);
          return;
        }
        marquerTermine();
        await refresh();
      } finally {
        setIsResolving(false);
      }
    },
    [tempRgaData, refresh, marquerTermine]
  );

  // Nettoyage du localStorage une fois les données confirmées en base.
  useEffect(() => {
    if (hasMigratedRef.current && parcours?.rgaSimulationData && !hasCleanedRef.current) {
      debug.log("[Cleanup] Nettoyage localStorage (données confirmées en base)");
      clearRGA();
      hasCleanedRef.current = true;
    }
  }, [parcours?.rgaSimulationData, clearRGA]);

  return {
    conflit: arbitrage && !arbitrage.verrouille ? arbitrage : null,
    resoudreConflit,
    isResolvingConflit: isResolving,
  };
}
