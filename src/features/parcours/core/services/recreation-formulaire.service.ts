import type { ActionResult } from "@/shared/types";
import { parcoursRepo } from "@/shared/database/repositories";
import { Step } from "../domain/value-objects/step";
import { reinitialiserDossierEtape } from "../../dossiers-ds/services/regeneration.service";
import { createEligibiliteDossier } from "./eligibilite.service";
import { createDiagnosticDossier } from "./diagnostic.service";
import { createDevisDossier } from "./devis.service";
import { getEffectiveRGAData } from "./rga-data.service";

/**
 * « Créer un nouveau formulaire » côté demandeur : réinitialise l'étape courante ET recrée
 * le prérempli dans la foulée (ADR-0027).
 *
 * Le découpage en deux clics — réinitialiser, puis relancer le CTA principal — échouait dès
 * que la simulation n'était pas dans le store du navigateur : le demandeur se retrouvait sans
 * pointeur et sans lien. La simulation est donc lue en base, pas transmise par le client.
 */
export type ResultatRecreation =
  /** Un ancien numéro avait été déposé entre-temps : rattaché, rien n'a été recréé. */
  | { statut: "rattache"; dsNumber: string; step: Step }
  | { statut: "recree"; dossierUrl: string; ancienDsNumber: string; step: Step };

export async function recreerFormulaireDemandeur(
  userId: string,
  step: Step
): Promise<ActionResult<ResultatRecreation>> {
  const parcours = await parcoursRepo.findByUserId(userId);
  if (!parcours) return { success: false, error: "Parcours non trouvé" };

  // L'étape vient du callout affiché, qui n'est pas toujours celle du parcours : un
  // diagnostic accepté rend déjà le CTA devis. On ne recrée donc que l'étape en cours.
  if (step !== parcours.currentStep) {
    return { success: false, error: "Votre parcours a avancé depuis l'affichage de cette page. Rechargez-la." };
  }

  // Le service refuse de lui-même une étape non recréable, un dossier déposé, ou un sondage
  // DN impossible. `force` ne relâche que la fenêtre anti-rafale : le demandeur a confirmé.
  const reinit = await reinitialiserDossierEtape(parcours.id, step, { force: true });
  if (!reinit.success) return reinit;

  if (reinit.data.statut === "rattache") {
    return { success: true, data: { statut: "rattache", dsNumber: reinit.data.dsNumber, step } };
  }

  const creation = await creerDossierEtape(userId, step, parcours);
  if (!creation.success) {
    // Le pointeur est déjà retiré : le CTA principal de l'étape reste le moyen de repartir.
    console.error("recreerFormulaireDemandeur : création du prérempli échouée", { step, error: creation.error });
    return {
      success: false,
      error: `Votre ancien lien a bien été retiré, mais le nouveau formulaire n'a pas pu être créé : ${creation.error}`,
    };
  }

  return {
    success: true,
    data: {
      statut: "recree",
      dossierUrl: creation.data.dossierUrl,
      ancienDsNumber: reinit.data.ancienDsNumber,
      step,
    },
  };
}

async function creerDossierEtape(
  userId: string,
  step: Step,
  parcours: Parameters<typeof getEffectiveRGAData>[0]
): Promise<ActionResult<{ dossierUrl: string }>> {
  if (step === Step.ELIGIBILITE) {
    const rgaData = getEffectiveRGAData(parcours);
    if (!rgaData) {
      return { success: false, error: "aucune donnée de simulation n'est enregistrée sur votre compte" };
    }
    return createEligibiliteDossier(userId, rgaData);
  }

  if (step === Step.DIAGNOSTIC) return createDiagnosticDossier(userId);
  if (step === Step.DEVIS) return createDevisDossier(userId);

  // Inatteignable : `reinitialiserDossierEtape` a déjà refusé les autres étapes.
  return { success: false, error: "cette étape n'a pas de formulaire à recréer" };
}
