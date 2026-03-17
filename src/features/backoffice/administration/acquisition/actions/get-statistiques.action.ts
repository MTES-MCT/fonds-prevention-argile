"use server";

import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { getStatistiques } from "../services/statistiques.service";
import { getScopeFilters } from "@/features/auth/permissions/services/agent-scope.service";
import type { ActionResult } from "@/shared/types";
import type { Statistiques } from "../domain/types/statistiques.types";

/**
 * Récupère les statistiques globales ou filtrées selon le scope de l'agent
 * Permissions : STATS_READ
 * Filtrage : Selon le scope de l'agent (entreprise AMO, départements)
 *
 * Note : Pour les agents AMO, les statistiques Matomo (visiteurs, taux de rebond)
 * ne sont pas disponibles car elles sont globales au site.
 */
export async function getStatistiquesAction(): Promise<ActionResult<Statistiques>> {
  // Vérifier la permission de lecture des stats
  const permissionCheck = await checkBackofficePermission(BackofficePermission.STATS_READ);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante pour consulter les statistiques",
    };
  }

  try {
    // Récupérer les filtres selon le scope de l'utilisateur
    const scopeFilters = await getScopeFilters();

    const stats = await getStatistiques(scopeFilters);

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);

    return {
      success: false,
      error: "Une erreur est survenue lors de la récupération des statistiques.",
    };
  }
}
