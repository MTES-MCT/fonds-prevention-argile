"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { assertNotSuperAdminReadOnly } from "@/features/backoffice/shared/actions/super-admin-access";
import { assertCanActAsResponsable } from "@/features/auth/permissions/services/responsable-permissions.service";
import { parcoursPreventionRepository } from "@/shared/database/repositories/parcours-prevention.repository";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import type { ActionResult } from "@/shared/types";

/**
 * Archive un dossier — réservé au responsable courant du dossier
 * (AV territorial pour un prospect, entreprise AMO assignée sinon).
 */
export async function archiveDossierAction(parcoursId: string, archiveReason: string): Promise<ActionResult<void>> {
  try {
    const readOnlyError = await assertNotSuperAdminReadOnly();
    if (readOnlyError) return { success: false, error: readOnlyError };

    const agentResult = await getCurrentAgent();
    if (!agentResult.success) return { success: false, error: agentResult.error };
    const agent = agentResult.data;

    const guard = await assertCanActAsResponsable(parcoursId, {
      entrepriseAmoId: agent.entrepriseAmoId ?? null,
      allersVersId: agent.allersVersId ?? null,
    });
    if (!guard.ok) return { success: false, error: guard.error };

    await parcoursPreventionRepository.updateSituationParticulier(
      parcoursId,
      SituationParticulier.ARCHIVE,
      archiveReason,
      agent.id
    );

    revalidatePath("/espace-agent", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[archiveDossierAction] Erreur:", error);
    return { success: false, error: "Erreur lors de l'archivage du dossier" };
  }
}

/**
 * Désarchive un dossier — réservé au responsable courant.
 * Remet le parcours en statut ELIGIBLE (le repository nettoie archivedAt).
 */
export async function unarchiveDossierAction(parcoursId: string): Promise<ActionResult<void>> {
  try {
    const readOnlyError = await assertNotSuperAdminReadOnly();
    if (readOnlyError) return { success: false, error: readOnlyError };

    const agentResult = await getCurrentAgent();
    if (!agentResult.success) return { success: false, error: agentResult.error };
    const agent = agentResult.data;

    const guard = await assertCanActAsResponsable(parcoursId, {
      entrepriseAmoId: agent.entrepriseAmoId ?? null,
      allersVersId: agent.allersVersId ?? null,
    });
    if (!guard.ok) return { success: false, error: guard.error };

    // Cible : ELIGIBLE si un AMO est responsable, PROSPECT sinon (workflow AV).
    const target =
      guard.responsable.type === "AMO" ? SituationParticulier.ELIGIBLE : SituationParticulier.PROSPECT;
    await parcoursPreventionRepository.updateSituationParticulier(parcoursId, target);

    revalidatePath("/espace-agent", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[unarchiveDossierAction] Erreur:", error);
    return { success: false, error: "Erreur lors du désarchivage du dossier" };
  }
}
