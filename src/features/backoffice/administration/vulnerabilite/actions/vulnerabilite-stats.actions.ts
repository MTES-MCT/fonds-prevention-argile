"use server";

import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import {
  getVulnerabiliteStatsBdd,
  getVulnerabiliteTopDepartements,
  getVulnerabiliteFunnel,
} from "../services/vulnerabilite-stats.service";
import type { ActionResult } from "@/shared/types";
import type { VulnerabiliteStatsBdd, VulnerabiliteTopDepartement } from "../domain/types/vulnerabilite-stats.types";
import type { FunnelStatistiques } from "@/features/backoffice/administration/acquisition/domain/types/matomo-funnels.types";
import type { PeriodeId } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

/**
 * Récupère les statistiques d'usage du simulateur de vulnérabilité RGA : total de simulations,
 * répartition par réponse et score moyen (table anonyme `vulnerabilite_simulations`).
 */
export async function getVulnerabiliteStatsAction(periodeId: PeriodeId): Promise<ActionResult<VulnerabiliteStatsBdd>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.STATS_READ);

  if (!permissionCheck.hasAccess) {
    return { success: false, error: "Permission insuffisante pour consulter les statistiques" };
  }

  try {
    const stats = await getVulnerabiliteStatsBdd(periodeId);
    return { success: true, data: stats };
  } catch (error) {
    console.error("Erreur lors de la recuperation des statistiques de vulnerabilite:", error);
    return { success: false, error: "Une erreur est survenue lors de la recuperation des statistiques." };
  }
}

/**
 * Récupère la répartition des simulations de vulnérabilité par département (Matomo).
 */
export async function getVulnerabiliteTopDepartementsAction(
  periodeId: PeriodeId
): Promise<ActionResult<VulnerabiliteTopDepartement[]>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.STATS_READ);

  if (!permissionCheck.hasAccess) {
    return { success: false, error: "Permission insuffisante" };
  }

  try {
    const stats = await getVulnerabiliteTopDepartements(periodeId);
    return { success: true, data: stats };
  } catch (error) {
    console.error("Erreur lors de la recuperation du top departements vulnerabilite:", error);
    return { success: false, error: "Une erreur est survenue." };
  }
}

/**
 * Récupère le funnel de conversion du simulateur de vulnérabilité (Matomo, 7 derniers jours).
 * `data: null` = funnel non configuré ou Matomo injoignable.
 */
export async function getVulnerabiliteFunnelAction(): Promise<ActionResult<FunnelStatistiques | null>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.STATS_READ);

  if (!permissionCheck.hasAccess) {
    return { success: false, error: "Permission insuffisante" };
  }

  try {
    const funnel = await getVulnerabiliteFunnel();
    return { success: true, data: funnel };
  } catch (error) {
    console.error("Erreur lors de la recuperation du funnel vulnerabilite:", error);
    return { success: false, error: "Une erreur est survenue." };
  }
}
