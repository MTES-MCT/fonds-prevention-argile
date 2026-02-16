"use client";

import { useEffect, useRef } from "react";
import { SimulateurProvider } from "./shared/SimulateurContext";
import { SimulateurFormulaire } from "./SimulateurFormulaire";
import { useSimulateurStore } from "../stores/simulateur.store";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";

interface SimulateurEditionProps {
  /** Nom complet du demandeur (ex: "Sophie Dubois") */
  nomComplet: string;
  /** Données RGA existantes à pré-remplir dans le simulateur */
  initialData: RGASimulationData | null;
}

/**
 * Composant d'édition des données de simulation par l'AMO.
 * Réutilise le SimulateurFormulaire standard mais :
 * - Personnalise le titre avec le nom du demandeur
 * - Masque le lien "Besoin d'aide ?"
 * - Pré-remplit le store avec les données existantes
 * - Démarre directement à l'étape 1 (skip intro)
 */
export function SimulateurEdition({ nomComplet, initialData }: SimulateurEditionProps) {
  const hasInitialized = useRef(false);
  const reset = useSimulateurStore((state) => state.reset);
  const start = useSimulateurStore((state) => state.start);
  const setEditMode = useSimulateurStore((state) => state.setEditMode);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Reset d'abord pour partir d'un état propre
    reset();

    // Activer le mode édition (désactive les early exits, préserve les réponses au retour arrière)
    setEditMode(true);

    // Démarrer (passe de intro → étape 1)
    start();

    // Si on a des données existantes, les injecter dans le store
    if (initialData) {
      // Injecter les données dans le store via la simulation state directement
      // On utilise setState pour éviter de déclencher les transitions step-by-step
      useSimulateurStore.setState((state) => ({
        simulation: {
          ...state.simulation,
          answers: {
            logement: initialData.logement,
            taxeFonciere: initialData.taxeFonciere,
            rga: initialData.rga,
            menage: initialData.menage,
            vous: initialData.vous,
          },
        },
      }));
    }
  }, [initialData, reset, start, setEditMode]);

  // Nettoyer le mode édition au démontage
  useEffect(() => {
    return () => {
      setEditMode(false);
    };
  }, [setEditMode]);

  const formTitle = `${nomComplet} - Données de simulation d\u2019\u00e9ligibilit\u00e9`;

  return (
    <SimulateurProvider formTitle={formTitle} showHelpLink={false}>
      <SimulateurFormulaire />
    </SimulateurProvider>
  );
}
