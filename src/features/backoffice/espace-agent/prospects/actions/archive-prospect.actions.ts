"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { hasPermission } from "@/features/auth/permissions/services/rbac.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { UserRole } from "@/shared/domain/value-objects";
import { parcoursPreventionRepository } from "@/shared/database/repositories/parcours-prevention.repository";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import type { ActionResult } from "@/shared/types";

/**
 * Archive un prospect (parcours sans AMO)
 *
 * Vérifie que l'agent connecté est un agent Allers-Vers.
 */
export async function archiveProspectAction(
  parcoursId: string,
  archiveReason: string,
): Promise<ActionResult<void>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Non authentifié" };
    }

    const role = user.role as UserRole;
    if (!hasPermission(role, BackofficePermission.PROSPECTS_VIEW)) {
      return { success: false, error: "Permission refusée" };
    }

    if (!user.allersVersId) {
      return { success: false, error: "Agent non lié à une structure Allers-Vers" };
    }

    // Vérifier que le parcours existe
    const parcours = await parcoursPreventionRepository.findById(parcoursId);
    if (!parcours) {
      return { success: false, error: "Parcours non trouvé" };
    }

    await parcoursPreventionRepository.updateSituationParticulier(
      parcoursId,
      SituationParticulier.ARCHIVE,
      archiveReason,
    );

    revalidatePath("/espace-agent", "layout");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[archiveProspectAction] Erreur:", error);
    return { success: false, error: "Erreur lors de l'archivage" };
  }
}

/**
 * Désarchive un prospect (parcours sans AMO)
 *
 * Remet le parcours en statut PROSPECT et nettoie les champs d'archivage.
 */
export async function unarchiveProspectAction(
  parcoursId: string,
): Promise<ActionResult<void>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Non authentifié" };
    }

    const role = user.role as UserRole;
    if (!hasPermission(role, BackofficePermission.PROSPECTS_VIEW)) {
      return { success: false, error: "Permission refusée" };
    }

    if (!user.allersVersId) {
      return { success: false, error: "Agent non lié à une structure Allers-Vers" };
    }

    const parcours = await parcoursPreventionRepository.findById(parcoursId);
    if (!parcours) {
      return { success: false, error: "Parcours non trouvé" };
    }

    // Retour à PROSPECT (workflow Allers-Vers, pas ELIGIBLE)
    await parcoursPreventionRepository.updateSituationParticulier(
      parcoursId,
      SituationParticulier.PROSPECT,
    );

    revalidatePath("/espace-agent", "layout");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[unarchiveProspectAction] Erreur:", error);
    return { success: false, error: "Erreur lors du désarchivage" };
  }
}
