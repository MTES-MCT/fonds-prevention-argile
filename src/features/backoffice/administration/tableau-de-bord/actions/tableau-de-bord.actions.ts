"use server";

import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { getTableauDeBordStats } from "../services/tableau-de-bord.service";
import { getAvailableDepartements } from "@/features/backoffice/administration/statistiques/services/statistiques-departement.service";
import type { ActionResult } from "@/shared/types";
import type { TableauDeBordStats, PeriodeId } from "../domain/types/tableau-de-bord.types";
import type { DepartementDisponible } from "@/features/backoffice/administration/statistiques/domain/types";

/**
 * Recupere les statistiques du tableau de bord super-admin
 */
export async function getTableauDeBordStatsAction(
  periodeId: PeriodeId,
  codeDepartement?: string,
): Promise<ActionResult<TableauDeBordStats>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.STATS_READ);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante pour consulter les statistiques",
    };
  }

  try {
    const stats = await getTableauDeBordStats(periodeId, codeDepartement);
    return { success: true, data: stats };
  } catch (error) {
    console.error("Erreur lors de la recuperation des statistiques du tableau de bord:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la recuperation des statistiques.",
    };
  }
}

/**
 * Recupere la liste des departements disponibles pour le filtre
 */
export async function getDepartementsDisponiblesAction(): Promise<ActionResult<DepartementDisponible[]>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.STATS_READ);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante",
    };
  }

  try {
    const departements = await getAvailableDepartements();
    return { success: true, data: departements };
  } catch (error) {
    console.error("Erreur lors de la recuperation des departements:", error);
    return {
      success: false,
      error: "Une erreur est survenue.",
    };
  }
}
