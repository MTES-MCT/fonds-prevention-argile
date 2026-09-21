"use server";

import { getSession } from "@/features/auth/server";
import { parcoursRepo } from "@/shared/database/repositories";
import type { ActionResult } from "@/shared/types/action-result.types";
import { ouvrirEligibiliteApresValidationAmo } from "../services/ouverture-eligibilite.service";

/**
 * Débloque le parcours du demandeur connecté resté à `CHOIX_AMO` avec un logement déclaré
 * éligible. Le parcours vient de la session : aucun identifiant n'entre par le client.
 */
export async function ouvrirEligibiliteApresValidation(): Promise<ActionResult<{ ouverte: boolean }>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const parcours = await parcoursRepo.findByUserId(session.userId);
    if (!parcours) {
      return { success: false, error: "Parcours non trouvé" };
    }

    return { success: true, data: { ouverte: await ouvrirEligibiliteApresValidationAmo(parcours.id) } };
  } catch (error) {
    console.error("Erreur ouvrirEligibiliteApresValidation:", error);
    return { success: false, error: "Erreur lors de l'ouverture de l'étape éligibilité" };
  }
}
