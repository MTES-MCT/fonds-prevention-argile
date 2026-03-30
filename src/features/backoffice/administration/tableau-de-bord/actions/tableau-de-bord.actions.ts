"use server";

import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import {
  getTableauDeBordStats,
  getAutresDemandesArchiveesDetail,
  getEligibiliteStats,
} from "../services/tableau-de-bord.service";
import { getAvailableDepartements } from "@/features/backoffice/administration/acquisition/services/statistiques-departement.service";
import type { ActionResult } from "@/shared/types";
import type { TableauDeBordStats, PeriodeId, DemandeArchiveeDetail } from "../domain/types/tableau-de-bord.types";
import type { EligibiliteStats } from "../domain/types/eligibilite-stats.types";
import type { DepartementDisponible } from "@/features/backoffice/administration/acquisition/domain/types";

/**
 * Recupere les statistiques du tableau de bord super-admin
 */
export async function getTableauDeBordStatsAction(
  periodeId: PeriodeId,
  codeDepartement?: string
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

/**
 * Recupere le detail individuel des demandes archivees hors top 5 pour le drawer
 */
export async function getAutresDemandesArchiveesAction(
  periodeId: PeriodeId,
  codeDepartement?: string
): Promise<ActionResult<{ total: number; demandes: DemandeArchiveeDetail[] }>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.STATS_READ);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante",
    };
  }

  try {
    const result = await getAutresDemandesArchiveesDetail(periodeId, codeDepartement);
    return { success: true, data: result };
  } catch (error) {
    console.error("Erreur lors de la recuperation des autres demandes archivees:", error);
    return {
      success: false,
      error: "Une erreur est survenue.",
    };
  }
}

/**
 * Recupere les statistiques de donnees d'eligibilite
 */
export async function getEligibiliteStatsAction(
  periodeId: PeriodeId,
  codeDepartement?: string
): Promise<ActionResult<EligibiliteStats>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.STATS_READ);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante pour consulter les statistiques",
    };
  }

  try {
    const stats = await getEligibiliteStats(periodeId, codeDepartement);
    return { success: true, data: stats };
  } catch (error) {
    console.error("Erreur lors de la recuperation des statistiques d'eligibilite:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la recuperation des statistiques.",
    };
  }
}
