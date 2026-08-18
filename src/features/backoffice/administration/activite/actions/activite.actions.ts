"use server";

import { checkAgentAccess } from "@/features/auth";
import { isSuperAdminRole } from "@/shared/domain/value-objects/user-role.enum";
import { getActiviteStats } from "../services/activite.service";
import type { ActionResult } from "@/shared/types";
import type { ActiviteStats } from "../domain/types/activite.types";
import type { PeriodeId } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

/**
 * Page reservee aux super-administrateurs (au meme titre que Notes/Synchros/Diagnostics
 * DN) : garde explicite ici, independante de BackofficePermission.STATS_READ qui est
 * aussi accorde aux AMO/Allers-Vers (ADR-0017).
 */
async function ensureSuperAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await checkAgentAccess();
  if (!access.hasAccess || !access.user?.role) {
    return { ok: false, error: "Non authentifié" };
  }
  if (!isSuperAdminRole(access.user.role)) {
    return { ok: false, error: "Accès réservé aux super-administrateurs" };
  }
  return { ok: true };
}

/**
 * Recupere les statistiques d'activite (nombre d'actions par type + evolution)
 */
export async function getActiviteStatsAction(
  periodeId: PeriodeId,
  codeDepartement?: string
): Promise<ActionResult<ActiviteStats>> {
  const guard = await ensureSuperAdmin();
  if (!guard.ok) {
    return { success: false, error: guard.error };
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
