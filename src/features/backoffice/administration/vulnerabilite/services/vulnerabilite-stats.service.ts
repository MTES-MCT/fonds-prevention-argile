import { vulnerabiliteSimulationsRepo } from "@/shared/database/repositories";
import type { VulnerabiliteSimulation } from "@/shared/database/schema/vulnerabilite-simulations";
import {
  CATEGORIES_AFFICHAGE,
  type CategorieAffichee,
} from "@/features/vulnerabilite-rga/domain/value-objects/grille-categorisation";
import {
  categoriserReponses,
  compterPoints,
} from "@/features/vulnerabilite-rga/domain/services/categorisation.service";
import {
  CRITERE_FIELDS,
  QUESTION_LABELS,
  getReponseLabel,
  reponsesDepuisColonnes,
} from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-critere-fields";
import {
  fetchMatomoCountByDimension,
  fetchMatomoFunnel,
} from "@/features/backoffice/administration/acquisition/adapters/matomo-api.adapter";
import { transformMatomoFunnelData } from "@/features/backoffice/administration/acquisition/services/matomo-funnel.service";
import type { FunnelStatistiques } from "@/features/backoffice/administration/acquisition/domain/types/matomo-funnels.types";
import { toOfficialCodeDepartement, getDepartementName } from "@/shared/constants/departements.constants";
import { getClientEnv } from "@/shared/config/env.config";
import { plageDerniersJours } from "@/features/backoffice/administration/acquisition/domain/decoupage-periode";
import { PERIODES } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type { PeriodeId } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type {
  CritereReponsesStats,
  ReponseDistribution,
  VulnerabilitePointsMoyens,
  VulnerabiliteStatsBdd,
  VulnerabiliteTopDepartement,
} from "../domain/types/vulnerabilite-stats.types";

function getDateRange(periodeId: PeriodeId): { debut: Date; fin: Date } {
  const fin = new Date();
  const periode = PERIODES.find((p) => p.id === periodeId);

  if (!periode || periode.jours === null) {
    return { debut: new Date(0), fin };
  }

  const debut = new Date();
  debut.setDate(debut.getDate() - periode.jours);
  return { debut, fin };
}

function formatMatomoDateRange(debut: Date, fin: Date): string {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return `${fmt(debut)},${fmt(fin)}`;
}

/**
 * Calcule, en un seul passage sur les lignes déjà chargées, la répartition en % de chaque
 * réponse pour chaque critère. Le dénominateur de chaque critère est le nombre de simulations
 * ayant répondu à CE critère (pas le total global) — un critère conditionnel (arbre_essence)
 * n'est répondu que par une partie des simulations.
 */
function computeReponsesStats(rows: VulnerabiliteSimulation[]): CritereReponsesStats[] {
  return CRITERE_FIELDS.map(({ critereId, field }) => {
    const counts = new Map<string, number>();
    let total = 0;

    for (const row of rows) {
      const reponse = row[field as keyof VulnerabiliteSimulation] as string | null;
      if (!reponse) continue;
      counts.set(reponse, (counts.get(reponse) ?? 0) + 1);
      total += 1;
    }

    const reponses: ReponseDistribution[] = [...counts.entries()]
      .map(([reponse, count]) => ({
        reponse,
        label: getReponseLabel(critereId, reponse),
        count,
        pourcentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return { critereId, label: QUESTION_LABELS[critereId] ?? critereId, total, reponses };
  });
}

// Les catégories sont relues dans la grille courante, pas figées à la simulation : une
// grille révisée requalifie aussi l'historique.
function computePointsMoyens(rows: VulnerabiliteSimulation[]): VulnerabilitePointsMoyens {
  const categories = Object.keys(CATEGORIES_AFFICHAGE) as CategorieAffichee[];
  const totaux = Object.fromEntries(categories.map((c) => [c, 0])) as Record<CategorieAffichee, number>;

  for (const row of rows) {
    const compte = compterPoints(categoriserReponses(reponsesDepuisColonnes(row)));
    for (const categorie of categories) totaux[categorie] += compte[categorie];
  }

  return Object.fromEntries(
    categories.map((c) => [c, rows.length > 0 ? Math.round((totaux[c] / rows.length) * 10) / 10 : null])
  ) as VulnerabilitePointsMoyens;
}

/**
 * Statistiques issues de la table anonyme `vulnerabilite_simulations` : total de simulations
 * terminées, répartition par réponse et points moyens par catégorie — Matomo ne sait pas calculer de moyenne
 * ni agréger des champs de formulaire, cf. ADR sur les stats du simulateur de vulnérabilité.
 */
export async function getVulnerabiliteStatsBdd(periodeId: PeriodeId): Promise<VulnerabiliteStatsBdd> {
  const { debut } = getDateRange(periodeId);
  const rows = await vulnerabiliteSimulationsRepo.findSince(debut);

  return {
    totalSimulations: rows.length,
    reponses: computeReponsesStats(rows),
    pointsMoyens: computePointsMoyens(rows),
  };
}

/**
 * Répartition des simulations par département, depuis Matomo (comme pour le simulateur
 * d'éligibilité) : réutilise la dimension département existante, isolée par le filtre
 * `eventAction==vulnerabilite_result` — aucun mélange avec l'autre simulateur.
 */
export async function getVulnerabiliteTopDepartements(periodeId: PeriodeId): Promise<VulnerabiliteTopDepartement[]> {
  const { debut, fin } = getDateRange(periodeId);
  const dateRange = formatMatomoDateRange(debut, fin);

  const dimensionIdStr = getClientEnv().NEXT_PUBLIC_MATOMO_DIMENSION_DEPARTEMENT_ID;
  const dimensionId = dimensionIdStr ? Number(dimensionIdStr) : null;

  if (!dimensionId) {
    console.warn("[getVulnerabiliteTopDepartements] NEXT_PUBLIC_MATOMO_DIMENSION_DEPARTEMENT_ID non configuré");
    return [];
  }

  try {
    const counts = await fetchMatomoCountByDimension(dimensionId, "eventAction==vulnerabilite_result", {
      period: "range",
      date: dateRange,
    });

    const result: VulnerabiliteTopDepartement[] = [];
    for (const [code, simulations] of counts) {
      result.push({
        codeDepartement: toOfficialCodeDepartement(code),
        nomDepartement: getDepartementName(code) ?? code,
        simulations,
      });
    }

    return result.sort((a, b) => b.simulations - a.simulations);
  } catch (error) {
    console.error("[getVulnerabiliteTopDepartements] echec Matomo:", error instanceof Error ? error.message : error);
    return [];
  }
}

/** Cf. Gotcha CLAUDE.md : l'API Matomo Funnels timeout sur les périodes longues, limité à 7 jours. */
const FUNNEL_PERIODE_JOURS = 7;

/**
 * Funnel de conversion du simulateur de vulnérabilité, depuis Matomo (funnel dédié, distinct
 * de celui du simulateur d'éligibilité). Retourne `null` si le funnel n'est pas encore configuré
 * côté Matomo (`NEXT_PUBLIC_MATOMO_FUNNEL_ID_VULNERABILITE` absente) ou en cas d'échec Matomo —
 * `DetailEtapesFunnel` affiche alors "données non disponibles" sans bloquer le reste de l'onglet.
 */
export async function getVulnerabiliteFunnel(): Promise<FunnelStatistiques | null> {
  const funnelId = getClientEnv().NEXT_PUBLIC_MATOMO_FUNNEL_ID_VULNERABILITE;
  if (!funnelId) return null;

  try {
    const dateRange = plageDerniersJours(FUNNEL_PERIODE_JOURS);

    const data = await fetchMatomoFunnel(funnelId, "range", dateRange);
    return transformMatomoFunnelData(data);
  } catch (error) {
    console.error("[getVulnerabiliteFunnel] echec Matomo:", error instanceof Error ? error.message : error);
    return null;
  }
}
