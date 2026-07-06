"use server";

import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { getStatistiques } from "../services/statistiques.service";
import { getStatsScopeFilters } from "@/features/auth/permissions/services/agent-scope.service";
import type { ActionResult } from "@/shared/types";
import type { Statistiques } from "../domain/types/statistiques.types";
import type { PeriodeId } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type { PartnerKey } from "@/shared/domain/partners";

/**
 * Récupère les statistiques d'acquisition (agrégats nationaux).
 * Permissions : STATS_READ
 * Périmètre : national pour tous les rôles habilités (admins, analyste national,
 * agents AMO / Allers-Vers, cf. ADR-0017), sauf analyste départemental restreint à
 * son territoire. Utilise le scope STATS (jamais scopé à l'entreprise de l'agent).
 */
export async function getStatistiquesAction(
  periodeId?: PeriodeId,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<ActionResult<Statistiques>> {
  // Vérifier la permission de lecture des stats
  const permissionCheck = await checkBackofficePermission(BackofficePermission.STATS_READ);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante pour consulter les statistiques",
    };
  }

  try {
    // Scope STATS (national, sauf analyste départemental) — jamais par entreprise AMO.
    const scopeFilters = await getStatsScopeFilters();

    const stats = await getStatistiques(scopeFilters, periodeId, codeDepartement, partner);

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
