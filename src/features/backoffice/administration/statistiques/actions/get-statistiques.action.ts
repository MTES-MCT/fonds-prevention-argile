"use server";

import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { getStatistiques } from "../services/statistiques.service";
import type { ActionResult } from "@/shared/types";
import type { Statistiques } from "../domain/types/statistiques.types";

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
    const stats = await getStatistiques();

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
