"use server";

import { revalidatePath } from "next/cache";
import { parcoursActionsRepo } from "@/shared/database/repositories";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { verifyProspectTerritoryAccess } from "@/features/auth/permissions/services/agent-scope.service";
import { renvoyerInvitationClaim } from "@/features/backoffice/espace-agent/creation-dossier/services/renvoyer-invitation.service";
import { buildAuthorSnapshot } from "@/features/backoffice/espace-agent/shared/services/author-snapshot";
import { ACTION_TYPE_INVITATION_RENVOYEE } from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import { UserRole } from "@/shared/domain/value-objects";
import type { ActionResult } from "@/shared/types";

/**
 * Renvoie l'email d'invitation "claim dossier" à un demandeur dont le dossier a
 * été pré-créé par un agent et qui ne l'a pas encore réclamé via FranceConnect.
 *
 * Contrôle d'accès aligné sur la visibilité du détail prospect
 * (`verifyProspectTerritoryAccess`) : un agent qui peut ouvrir le prospect peut
 * lui renvoyer l'invitation ; hors territoire = refus. La mutation (token + envoi)
 * est déléguée à `renvoyerInvitationClaim` ; l'action ajoute la garde, l'audit
 * (`parcours_actions`) et la revalidation.
 */
export async function renvoyerInvitationAction(parcoursId: string): Promise<ActionResult<void>> {
  try {
    const agentResult = await getCurrentAgent();
    if (!agentResult.success) return { success: false, error: agentResult.error };
    const agent = agentResult.data;

    const territoryError = await verifyProspectTerritoryAccess(parcoursId, {
      id: agent.id,
      role: agent.role as UserRole,
      entrepriseAmoId: agent.entrepriseAmoId ?? null,
      allersVersId: agent.allersVersId ?? null,
    });
    if (territoryError) return { success: false, error: territoryError };

    const result = await renvoyerInvitationClaim({ parcoursId, agentId: agent.id });
    if (!result.success) {
      return { success: false, error: result.error ?? "Erreur lors du renvoi de l'invitation" };
    }

    // Audit : qui a renvoyé l'invitation et quand.
    const snapshot = await buildAuthorSnapshot(agent);
    await parcoursActionsRepo.create({
      parcoursId,
      agentId: agent.id,
      actionType: ACTION_TYPE_INVITATION_RENVOYEE,
      message: "Email d'invitation renvoyé au demandeur.",
      authorName: snapshot.authorName,
      authorStructure: snapshot.authorStructure,
      authorStructureType: snapshot.authorStructureType,
    });

    revalidatePath("/espace-agent", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[renvoyerInvitationAction] Erreur:", error);
    return { success: false, error: "Erreur lors du renvoi de l'invitation" };
  }
}
