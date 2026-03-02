"use server";

import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import {
  getAvailableDepartements,
  getStatistiquesDepartement,
} from "../services/statistiques-departement.service";
import type { ActionResult } from "@/shared/types";
import type { StatistiquesDepartement, DepartementDisponible } from "../domain/types";

/**
 * Récupère la liste des départements ayant des parcours avec données de simulation.
 * Permissions : STATS_READ
 */
export async function getDepartementsDisponiblesAction(): Promise<ActionResult<DepartementDisponible[]>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.STATS_READ);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante pour consulter les statistiques",
    };
  }

  try {
    const departements = await getAvailableDepartements();

    return {
      success: true,
      data: departements,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des départements:", error);

    return {
      success: false,
      error: "Une erreur est survenue lors de la récupération des départements.",
    };
  }
}

/**
 * Récupère les statistiques complètes pour un département donné.
 * Permissions : STATS_READ
 */
export async function getStatistiquesDepartementAction(
  codeDepartement: string,
): Promise<ActionResult<StatistiquesDepartement>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.STATS_READ);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante pour consulter les statistiques",
    };
  }

  try {
    const stats = await getStatistiquesDepartement(codeDepartement);

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques département:", error);

    return {
      success: false,
      error: "Une erreur est survenue lors de la récupération des statistiques.",
    };
  }
}
