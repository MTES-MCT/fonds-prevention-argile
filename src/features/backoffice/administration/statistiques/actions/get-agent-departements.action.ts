"use server";

import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { agentPermissionsRepository } from "@/shared/database";
import type { ActionResult } from "@/shared/types";

/**
 * Récupère les codes départements assignés à l'agent connecté.
 * Utilisé pour les agents DDT qui n'ont accès qu'à leur(s) département(s).
 * Permissions : STATS_READ
 */
export async function getAgentDepartementsAction(): Promise<ActionResult<string[]>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.STATS_READ);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante",
    };
  }

  try {
    const user = await getCurrentUser();

    if (!user?.agentId) {
      return { success: true, data: [] };
    }

    const departements = await agentPermissionsRepository.getDepartementsByAgentId(user.agentId);

    return { success: true, data: departements };
  } catch (error) {
    console.error("Erreur lors de la récupération des départements de l'agent:", error);

    return {
      success: false,
      error: "Une erreur est survenue lors de la récupération des départements.",
    };
  }
}
