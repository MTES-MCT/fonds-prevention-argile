"use server";

import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { getCommentairesAdmin } from "../services/commentaires-admin.service";
import type { ActionResult } from "@/shared/types";
import type { CommentairesAdminFilters, CommentairesAdminListResult } from "../domain/types/commentaire-admin.types";

/**
 * Recupere la liste paginee des commentaires pour l'administration
 * Permission requise : COMMENTAIRES_READ_ALL
 */
export async function getCommentairesAdminAction(
  filters: CommentairesAdminFilters
): Promise<ActionResult<CommentairesAdminListResult>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.COMMENTAIRES_READ_ALL);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante pour consulter les commentaires",
    };
  }

  try {
    const result = await getCommentairesAdmin(filters);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Erreur getCommentairesAdminAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}
