"use server";

import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { getActiviteStats } from "../services/activite.service";
import type { ActionResult } from "@/shared/types";
import type { ActiviteStats } from "../domain/types/activite.types";
import type { PeriodeId } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

export async function getActiviteStatsAction(
  periodeId: PeriodeId,
  codeDepartement?: string
): Promise<ActionResult<ActiviteStats>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.STATS_READ);
  if (!permissionCheck.hasAccess) {
    return { success: false, error: "Permission insuffisante pour consulter les statistiques" };
  }

  try {
    const stats = await getActiviteStats(periodeId, codeDepartement);
    return { success: true, data: stats };
  } catch (error) {
    console.error("Erreur lors de la recuperation des statistiques d'activite:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la recuperation des statistiques.",
    };
  }
}
