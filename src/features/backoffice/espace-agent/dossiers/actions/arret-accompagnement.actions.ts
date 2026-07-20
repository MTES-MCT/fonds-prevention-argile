"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { assertNotSuperAdminReadOnly } from "@/features/backoffice/shared/actions/super-admin-access";
import { assertCanActAsResponsable } from "@/features/auth/permissions/services/responsable-permissions.service";
import { parcoursActionsRepo } from "@/shared/database/repositories";
import { buildAuthorSnapshot } from "@/features/backoffice/espace-agent/shared/services/author-snapshot";
import {
  ACTION_TYPE_ACCOMPAGNEMENT_ARRETE,
  ACTION_TYPE_ARRET_REFUSE,
} from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import { detacherAmo } from "@/features/parcours/amo/services/detachement-amo.service";
import { refuserDemandeArret } from "@/features/parcours/amo/services/arret-accompagnement.service";
import type { ActionResult } from "@/shared/types";
import { ROLES_ARRET_ACCOMPAGNEMENT } from "../domain/arret-accompagnement";

/**
 * L'AMO cesse d'accompagner le demandeur, qui poursuit en autonomie.
 *
 * Réservé au responsable courant du dossier. Effet de bord assumé : l'entreprise est
 * détachée, donc l'AMO perd immédiatement l'accès au dossier (l'aller-vers du territoire
 * en devient responsable). L'UI doit rediriger vers le listing après succès.
 */
export async function arreterAccompagnementAction(parcoursId: string, raisons: string[]): Promise<ActionResult<void>> {
  try {
    const readOnlyError = await assertNotSuperAdminReadOnly();
    if (readOnlyError) return { success: false, error: readOnlyError };

    const agentResult = await getCurrentAgent();
    if (!agentResult.success) return { success: false, error: agentResult.error };
    const agent = agentResult.data;

    if (!ROLES_ARRET_ACCOMPAGNEMENT.includes(agent.role)) {
      return { success: false, error: "Action réservée aux AMO" };
    }

    const guard = await assertCanActAsResponsable(parcoursId, {
      entrepriseAmoId: agent.entrepriseAmoId ?? null,
      allersVersId: agent.allersVersId ?? null,
    });
    if (!guard.ok) return { success: false, error: guard.error };

    const raisonsPropres = raisons.map((r) => r.trim()).filter(Boolean);
    if (raisonsPropres.length === 0) {
      return { success: false, error: "Merci de préciser au moins une raison" };
    }

    // Snapshot AVANT la mutation : après détachement, l'agent n'est plus rattaché au dossier.
    const snapshot = await buildAuthorSnapshot(agent);

    const result = await detacherAmo({ parcoursId });
    if (!result.success) return { success: false, error: result.error };

    await parcoursActionsRepo.create({
      parcoursId,
      agentId: agent.id,
      actionType: ACTION_TYPE_ACCOMPAGNEMENT_ARRETE,
      message: raisonsPropres.join(" - "),
      authorName: snapshot.authorName,
      authorStructure: snapshot.authorStructure,
      authorStructureType: snapshot.authorStructureType,
    });

    revalidatePath("/espace-agent", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[arreterAccompagnementAction] Erreur:", error);
    return { success: false, error: "Erreur lors de l'arrêt de l'accompagnement" };
  }
}

/**
 * L'AMO mandataire refuse la demande d'arrêt du demandeur et poursuit l'accompagnement.
 * Le dossier reste inchangé ; seul le bandeau d'alerte disparaît.
 */
export async function refuserArretAccompagnementAction(parcoursId: string): Promise<ActionResult<void>> {
  try {
    const readOnlyError = await assertNotSuperAdminReadOnly();
    if (readOnlyError) return { success: false, error: readOnlyError };

    const agentResult = await getCurrentAgent();
    if (!agentResult.success) return { success: false, error: agentResult.error };
    const agent = agentResult.data;

    if (!ROLES_ARRET_ACCOMPAGNEMENT.includes(agent.role)) {
      return { success: false, error: "Action réservée aux AMO" };
    }

    const guard = await assertCanActAsResponsable(parcoursId, {
      entrepriseAmoId: agent.entrepriseAmoId ?? null,
      allersVersId: agent.allersVersId ?? null,
    });
    if (!guard.ok) return { success: false, error: guard.error };

    const result = await refuserDemandeArret({ parcoursId });
    if (!result.success) return { success: false, error: result.error };

    const snapshot = await buildAuthorSnapshot(agent);
    await parcoursActionsRepo.create({
      parcoursId,
      agentId: agent.id,
      actionType: ACTION_TYPE_ARRET_REFUSE,
      message: "L'accompagnement se poursuit : la demande d'arrêt du demandeur a été refusée.",
      authorName: snapshot.authorName,
      authorStructure: snapshot.authorStructure,
      authorStructureType: snapshot.authorStructureType,
    });

    revalidatePath("/espace-agent", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[refuserArretAccompagnementAction] Erreur:", error);
    return { success: false, error: "Erreur lors du refus de la demande d'arrêt" };
  }
}
