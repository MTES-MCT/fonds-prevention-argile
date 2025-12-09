"use server";

import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { getUsersWithParcours as getUsersWithParcoursService } from "../services/users-tracking.service";
import type { ActionResult } from "@/shared/types";
import type { UserWithParcoursDetails } from "../domain/types/user-with-parcours.types";

export async function getUsersWithParcours(): Promise<ActionResult<UserWithParcoursDetails[]>> {
  // Vérifier la permission de lecture des users
  const permissionCheck = await checkBackofficePermission(BackofficePermission.USERS_READ);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante pour consulter les utilisateurs",
    };
  }

  try {
    const users = await getUsersWithParcoursService();

    return {
      success: true,
      data: users,
    };
  } catch (error) {
    console.error("Erreur getUsersWithParcours:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}
