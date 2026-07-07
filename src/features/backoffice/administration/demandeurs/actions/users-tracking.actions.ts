"use server";

import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import {
  getUsersWithParcours as getUsersWithParcoursService,
  toStatsProjection,
} from "../services/users-tracking.service";
import { getScopeFilters, getStatsScopeFilters } from "@/features/auth/permissions/services/agent-scope.service";
import type { ActionResult } from "@/shared/types";
import type { UserWithParcoursDetails } from "../domain/types/user-with-parcours.types";

/**
 * Récupère les données demandeurs AGRÉGÉES pour les statistiques.
 * Permissions : USERS_STATS_READ (analystes + agents AMO/Allers-Vers, cf. ADR-0017).
 * Périmètre : national, sauf analyste départemental (restreint à son territoire).
 *
 * Sécurité : le scope stats est distinct du scope dossiers (jamais par entreprise),
 * et chaque demandeur est réduit à une projection sans PII ni donnée localisante
 * (`toStatsProjection`) — pas de nom/adresse/token/identifiants DS côté client.
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
    const scopeFilters = await getStatsScopeFilters();

    const users = await getUsersWithParcoursService(scopeFilters);

    // Projection agrégée : retire toute donnée nominative / sensible avant envoi client.
    const statsUsers = users.map(toStatsProjection);

    return {
      success: true,
      data: statsUsers,
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
