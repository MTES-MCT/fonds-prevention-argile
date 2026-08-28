"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/features/auth/server";
import { parcoursRepo, parcoursActionsRepo } from "@/shared/database/repositories";
import type { ActionResult } from "@/shared/types/action-result.types";
import { ACTION_TYPE_DEMANDE_ACCOMPAGNEMENT } from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import { demanderAccompagnementDemandeur } from "../services/amo-selection.service";

/**
 * Demande un accompagnement AMO pour le demandeur connecté, après avoir choisi
 * l'autonomie (mode FACULTATIF uniquement).
 */
export async function demanderMonAccompagnement(): Promise<ActionResult<{ amoNom: string }>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const parcours = await parcoursRepo.findByUserId(session.userId);
    if (!parcours) {
      return { success: false, error: "Parcours non trouvé" };
    }

    const result = await demanderAccompagnementDemandeur(session.userId);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const { amoNom, demandeurPrenom, demandeurNom } = result.data;

    // Audit visible des professionnels : l'auteur est le demandeur, pas un agent.
    await parcoursActionsRepo.create({
      parcoursId: parcours.id,
      agentId: null,
      actionType: ACTION_TYPE_DEMANDE_ACCOMPAGNEMENT,
      message: `Le demandeur, après avoir choisi l'autonomie, demande à être accompagné par ${amoNom || "un AMO"}.`,
      authorName: `${demandeurPrenom} ${demandeurNom}`.trim() || "Le demandeur",
      authorStructure: null,
      authorStructureType: "DEMANDEUR",
    });

    revalidatePath("/mon-compte");
    revalidatePath("/espace-agent", "layout");

    return { success: true, data: { amoNom } };
  } catch (error) {
    console.error("Erreur demanderMonAccompagnement:", error);
    return { success: false, error: "Erreur lors de la demande d'accompagnement" };
  }
}
