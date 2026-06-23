"use server";

import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import { getCurrentUser } from "@/features/auth/services/user.service";
import {
  getTableauDeBordStats,
  getMatomoSimulationsStats,
  getAutresDemandesArchiveesDetail,
  getEligibiliteStats,
  getTopDepartementsMatomo,
  getTopCommunesMatomo,
} from "../services/tableau-de-bord.service";
import { getAvailableDepartements } from "@/features/backoffice/administration/acquisition/services/statistiques-departement.service";
import type { ActionResult } from "@/shared/types";
import type {
  TableauDeBordStats,
  MatomoSimulationsStats,
  PeriodeId,
  DemandeArchiveeDetail,
  DepartementStats,
  CommuneSimulationsStats,
} from "../domain/types/tableau-de-bord.types";
import type { EligibiliteStats } from "../domain/types/eligibilite-stats.types";
import type { DepartementDisponible } from "@/features/backoffice/administration/acquisition/domain/types";
import type { PartnerKey } from "@/shared/domain/partners";

/**
 * Recupere les statistiques du tableau de bord super-admin
 */
export async function getTableauDeBordStatsAction(
  periodeId: PeriodeId,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<ActionResult<TableauDeBordStats>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.STATS_READ);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante pour consulter les statistiques",
    };
  }

  try {
    const stats = await getTableauDeBordStats(periodeId, codeDepartement, partner);
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
 * Recupere les statistiques Matomo des simulations (chargement asynchrone, separe des stats BDD)
 */
export async function getMatomoSimulationsStatsAction(
  periodeId: PeriodeId,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<ActionResult<MatomoSimulationsStats>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.STATS_READ);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante pour consulter les statistiques",
    };
  }

  try {
    const stats = await getMatomoSimulationsStats(periodeId, codeDepartement, partner);
    return { success: true, data: stats };
  } catch (error) {
    console.error("Erreur lors de la recuperation des statistiques Matomo:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la recuperation des statistiques Matomo.",
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
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<ActionResult<{ total: number; demandes: DemandeArchiveeDetail[] }>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.STATS_READ);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante",
    };
  }

  try {
    // Surface nominative (noms des demandeurs archives) : restreindre au perimetre.
    // Admin = national ; analyste departemental = ses departements ; analyste national
    // ou sans perimetre = aucune donnee individuelle (ADR-0014). getScopeFilters ne
    // suffit pas ici car il confond admin-national et analyste-national (tous deux null).
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Non authentifie" };
    }

    const scope = await calculateAgentScope({
      id: user.agentId ?? "",
      role: user.role,
      entrepriseAmoId: user.entrepriseAmoId ?? null,
      allersVersId: user.allersVersId ?? null,
    });

    let scopeDepartements: string[] | null;
    if (scope.canViewAllDossiers) {
      scopeDepartements = null; // national (admins)
    } else if (scope.departements.length > 0) {
      scopeDepartements = scope.departements; // analyste departemental
    } else {
      // analyste national / sans perimetre : aucune donnee nominative
      return { success: true, data: { total: 0, demandes: [] } };
    }

    const result = await getAutresDemandesArchiveesDetail(periodeId, codeDepartement, partner, scopeDepartements);
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
 * Recupere le top departements avec simulations Matomo (toutes simulations, pas seulement comptes crees)
 */
export async function getTopDepartementsMatomoAction(
  periodeId: PeriodeId,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<ActionResult<DepartementStats[]>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.STATS_READ);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante",
    };
  }

  try {
    const stats = await getTopDepartementsMatomo(periodeId, codeDepartement, partner);
    return { success: true, data: stats };
  } catch (error) {
    console.error("Erreur lors de la recuperation du top departements Matomo:", error);
    return {
      success: false,
      error: "Une erreur est survenue.",
    };
  }
}

/**
 * Recupere le top communes avec simulations Matomo (toutes simulations, pas seulement comptes crees)
 */
export async function getTopCommunesMatomoAction(
  periodeId: PeriodeId,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<ActionResult<CommuneSimulationsStats[]>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.STATS_READ);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante",
    };
  }

  try {
    const stats = await getTopCommunesMatomo(periodeId, codeDepartement, partner);
    return { success: true, data: stats };
  } catch (error) {
    console.error("Erreur lors de la recuperation du top communes Matomo:", error);
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
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<ActionResult<EligibiliteStats>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.STATS_READ);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante pour consulter les statistiques",
    };
  }

  try {
    const stats = await getEligibiliteStats(periodeId, codeDepartement, partner);
    return { success: true, data: stats };
  } catch (error) {
    console.error("Erreur lors de la recuperation des statistiques d'eligibilite:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la recuperation des statistiques.",
    };
  }
}
