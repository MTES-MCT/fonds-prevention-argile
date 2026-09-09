"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/features/auth/server";
import type { ActionResult } from "@/shared/types";
import type { RGASimulationData } from "@/shared/domain/types";
import { parcoursRepo, userRepo, dossierDsRepo } from "@/shared/database/repositories";
import { formatNomComplet } from "@/shared/utils";
import { Step } from "@/shared/domain/value-objects/step.enum";
import type { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { emitBrevoEvent, BREVO_EVENTS, buildConseillerAttributes } from "@/shared/email/brevo";
import { appliquerVerdictSimulationDemandeur } from "../services/simulation-eligibilite.service";
import { isSameSimulationContent } from "../utils/simulation-comparison";
import { peutModifierSaSimulation } from "../domain/value-objects/edition-simulation";

export interface ResultatEnregistrementSimulation {
  nonEligible: boolean;
}

/**
 * Enregistre la simulation que le demandeur vient de corriger sur son espace.
 *
 * Le parcours est résolu par la **session**, jamais par un identifiant reçu du
 * client : l'action n'offre donc aucune prise pour agir sur le dossier d'autrui.
 *
 * À distinguer de `migrateSimulationDataToDatabase`, qui rattache une **première**
 * simulation (et porte à ce titre l'évènement `demandeur_cree`). Ici le compte a
 * déjà une simulation connue, donc déjà été accueilli.
 */
export async function enregistrerSimulationDemandeurAction(
  rgaData: RGASimulationData
): Promise<ActionResult<ResultatEnregistrementSimulation>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const parcours = await parcoursRepo.findByUserId(session.userId);
    if (!parcours) {
      return { success: false, error: "Parcours non trouvé" };
    }

    // Même barrière que l'écran : sans elle, un POST direct contournerait la
    // lecture seule (correction d'agent, formulaire chez la DDT).
    const eligibiliteDsStatus = await getEligibiliteDsStatus(parcours.id);
    if (
      !peutModifierSaSimulation({
        simulationCorrigeeParAgent: Boolean(parcours.rgaSimulationDataAgent),
        eligibiliteDsStatus,
      })
    ) {
      return { success: false, error: "Vos données de simulation ne sont plus modifiables" };
    }

    const simulation = { ...rgaData, simulatedAt: new Date().toISOString() } as RGASimulationData;

    // Un enregistrement à l'identique ne doit ni redater la simulation ni ré-émettre.
    if (isSameSimulationContent(parcours.rgaSimulationData, simulation)) {
      return { success: true, data: { nonEligible: false } };
    }

    await parcoursRepo.updateRGAData(parcours.id, simulation);

    const user = await userRepo.findById(session.userId);
    const verdict = await appliquerVerdictSimulationDemandeur({
      parcours,
      rgaData: simulation,
      demandeurNom: formatNomComplet(user?.prenom, user?.nom),
    });

    // Best-effort : le territoire a pu changer avec l'adresse, donc le conseiller aussi.
    const conseillerAttributes = await buildConseillerAttributes(parcours.id);
    await emitBrevoEvent(parcours.id, BREVO_EVENTS.SIMULATION_ENREGISTREE, { attributes: conseillerAttributes });

    // Seul un basculement vers l'inéligibilité déclenche le mail dédié : une simulation
    // déjà archivée pour ce motif ne doit pas le renvoyer à chaque correction.
    if (verdict.archived) {
      await emitBrevoEvent(parcours.id, BREVO_EVENTS.SIMULATION_NON_ELIGIBLE);
    }

    revalidatePath(ROUTES.particulier.monCompte);

    return { success: true, data: { nonEligible: verdict.nonEligible } };
  } catch (error) {
    console.error("[enregistrerSimulationDemandeur] Erreur:", error);
    return { success: false, error: "Erreur lors de l'enregistrement de vos données de simulation" };
  }
}

async function getEligibiliteDsStatus(parcoursId: string): Promise<DSStatus | null> {
  const dossiers = await dossierDsRepo.findByParcoursId(parcoursId);
  return (dossiers.find((dossier) => dossier.step === Step.ELIGIBILITE)?.dsStatus as DSStatus | null) ?? null;
}
