"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/features/auth/server";
import { parcoursRepo, parcoursActionsRepo } from "@/shared/database/repositories";
import type { ActionResult } from "@/shared/types/action-result.types";
import {
  ACTION_TYPE_ACCOMPAGNEMENT_ARRETE,
  ACTION_TYPE_ARRET_DEMANDE,
} from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import {
  annulerAccompagnementDemandeur,
  type ArretAccompagnementOutcome,
} from "../services/arret-accompagnement.service";

/**
 * Annule l'accompagnement AMO du demandeur connecté.
 *
 * Selon l'engagement de l'AMO, l'issue est soit un arrêt immédiat, soit une demande
 * d'accord (cf. `annulerAccompagnementDemandeur`). L'appelant lit `outcome` pour savoir
 * quoi afficher.
 */
export async function annulerMonAccompagnement(): Promise<ActionResult<{ outcome: ArretAccompagnementOutcome }>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const parcours = await parcoursRepo.findByUserId(session.userId);
    if (!parcours) {
      return { success: false, error: "Parcours non trouvé" };
    }

    const result = await annulerAccompagnementDemandeur({ parcoursId: parcours.id });
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const { outcome, amoNom, demandeurPrenom, demandeurNom } = result.data;

    // Audit visible des professionnels : l'auteur est le demandeur, pas un agent.
    await parcoursActionsRepo.create({
      parcoursId: parcours.id,
      agentId: null,
      actionType: outcome === "detache" ? ACTION_TYPE_ACCOMPAGNEMENT_ARRETE : ACTION_TYPE_ARRET_DEMANDE,
      message:
        outcome === "detache"
          ? "Le demandeur a choisi de poursuivre ses démarches en autonomie."
          : `Le demandeur demande l'arrêt de l'accompagnement. L'accord de ${amoNom || "l'AMO"} (mandataire financier) est requis.`,
      authorName: `${demandeurPrenom} ${demandeurNom}`.trim() || "Le demandeur",
      authorStructure: null,
      authorStructureType: "DEMANDEUR",
    });

    revalidatePath("/mon-compte");
    revalidatePath("/espace-agent", "layout");

    return { success: true, data: { outcome } };
  } catch (error) {
    console.error("Erreur annulerMonAccompagnement:", error);
    return { success: false, error: "Erreur lors de l'annulation de l'accompagnement" };
  }
}
