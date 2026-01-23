"use server";

import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { getUsersWithParcours as getUsersWithParcoursService } from "../services/users-tracking.service";
import { getScopeFilters } from "@/features/auth/permissions/services/agent-scope.service";
import type { ActionResult } from "@/shared/types";
import type { UserWithParcoursDetails } from "../domain/types/user-with-parcours.types";

/**
 * Récupère les données users simplifiées pour les statistiques (analystes)
 * Permissions : USERS_STATS_READ
 * Filtrage : Selon le scope de l'agent (entreprise AMO, départements)
 */
export async function getUsersForStats(): Promise<ActionResult<UserWithParcoursDetails[]>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.USERS_STATS_READ);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante pour consulter les statistiques",
    };
  }

  try {
    // Récupérer les filtres selon le scope de l'utilisateur
    const scopeFilters = await getScopeFilters();

    const users = await getUsersWithParcoursService(scopeFilters);

    // Anonymiser les données sensibles pour les analystes
    const anonymizedUsers = users.map((user) => ({
      ...user,
      user: {
        ...user.user,
        email: null, // Masquer l'email
        telephone: null, // Masquer le téléphone
      },
      amoValidation: user.amoValidation
        ? {
            ...user.amoValidation,
            userData: {
              ...user.amoValidation.userData,
              email: null,
              telephone: null,
            },
          }
        : null,
    }));

    return {
      success: true,
      data: anonymizedUsers,
    };
  } catch (error) {
    console.error("Erreur getUsersForStats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Récupère les données users complètes (admins)
 * Permissions : USERS_READ
 * Filtrage : Selon le scope de l'agent (entreprise AMO, départements)
 */
export async function getUsersWithParcours(): Promise<ActionResult<UserWithParcoursDetails[]>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.USERS_READ);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante pour consulter les utilisateurs",
    };
  }

  try {
    // Récupérer les filtres selon le scope de l'utilisateur
    const scopeFilters = await getScopeFilters();

    const users = await getUsersWithParcoursService(scopeFilters);

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
