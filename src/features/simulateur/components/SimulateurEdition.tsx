"use client";

import { useEffect } from "react";
import { SimulateurProvider } from "./shared/SimulateurContext";
import { SimulateurFormulaire } from "./SimulateurFormulaire";
import { useSimulateurStore } from "../stores/simulateur.store";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import type { ActionResult } from "@/shared/types";
import type { SimulateurAudience } from "./shared/SimulateurContext";

interface SimulateurEditionProps {
  /** Nom complet du demandeur (ex: "Sophie Dubois") */
  nomComplet: string;
  /** Données RGA existantes à pré-remplir dans le simulateur */
  initialData: RGASimulationData | null;
  /** ID du dossier ou parcours (pour la sauvegarde) */
  dossierId?: string;
  /** Enregistrement : l'appelant décide où atterrissent les données. */
  onSave: (rgaData: RGASimulationData) => Promise<ActionResult<unknown>>;
  /** Décide des textes de l'écran de résultat. */
  audience?: SimulateurAudience;
  /** URL de redirection après sauvegarde si éligible (page de détail) */
  redirectAfterSave?: string;
  /** URL de redirection après sauvegarde si non éligible (page de liste) */
  redirectAfterSaveList?: string;
}

/**
 * Écran d'édition d'une simulation existante, partagé par l'agent et le demandeur.
 * Réutilise le SimulateurFormulaire standard mais :
 * - Personnalise le titre avec le nom du demandeur
 * - Masque le lien "Besoin d'aide ?"
 * - Pré-remplit le store avec les données existantes
 * - Démarre directement à l'étape 1 (skip intro)
 */
export function SimulateurEdition({
  nomComplet,
  initialData,
  dossierId,
  onSave,
  audience = "agent",
  redirectAfterSave,
  redirectAfterSaveList,
}: SimulateurEditionProps) {
  const reset = useSimulateurStore((state) => state.reset);
  const start = useSimulateurStore((state) => state.start);
  const setEditMode = useSimulateurStore((state) => state.setEditMode);
  const setEarlyExit = useSimulateurStore((state) => state.setEarlyExit);

  useEffect(() => {
    // Reset d'abord pour partir d'un état propre
    reset();

    // Mode édition : préserve les réponses au retour arrière
    setEditMode(true);
    // L'AMO ne re-saisit pas forcément tout : un critère non évalué ne doit pas couper la saisie.
    setEarlyExit(false);

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

    // Nettoyer le mode édition au démontage
    return () => {
      setEditMode(false);
      setEarlyExit(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formTitle =
    audience === "demandeur"
      ? "Mes données de simulation d\u2019\u00e9ligibilit\u00e9"
      : `${nomComplet} - Données de simulation d\u2019\u00e9ligibilit\u00e9`;

  return (
    <SimulateurProvider
      formTitle={formTitle}
      showHelpLink={false}
      initialData={initialData}
      dossierId={dossierId}
      onSave={onSave}
      audience={audience}
      redirectAfterSave={redirectAfterSave}
      redirectAfterSaveList={redirectAfterSaveList}>
      <SimulateurFormulaire />
    </SimulateurProvider>
  );
}
