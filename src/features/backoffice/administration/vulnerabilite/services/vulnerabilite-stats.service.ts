import { vulnerabiliteSimulationsRepo } from "@/shared/database/repositories";
import type { VulnerabiliteSimulation } from "@/shared/database/schema/vulnerabilite-simulations";
import {
  CATEGORIES_CONFIG,
  type CategorieVulnerabilite,
} from "@/features/vulnerabilite-rga/domain/value-objects/grille-ponderation";
import {
  CRITERE_FIELDS,
  QUESTION_LABELS,
  getReponseLabel,
} from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-critere-fields";
import {
  fetchMatomoCountByDimension,
  fetchMatomoFunnel,
} from "@/features/backoffice/administration/acquisition/adapters/matomo-api.adapter";
import { transformMatomoFunnelData } from "@/features/backoffice/administration/acquisition/services/matomo-funnel.service";
import type { FunnelStatistiques } from "@/features/backoffice/administration/acquisition/domain/types/matomo-funnels.types";
import { toOfficialCodeDepartement, getDepartementName } from "@/shared/constants/departements.constants";
import { getClientEnv } from "@/shared/config/env.config";
import { PERIODES } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type { PeriodeId } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type {
  CritereReponsesStats,
  ReponseDistribution,
  VulnerabiliteScoreMoyen,
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

function computeScoreMoyen(rows: VulnerabiliteSimulation[]): VulnerabiliteScoreMoyen {
  const parCategorie = {} as Record<CategorieVulnerabilite, number | null>;

  for (const cat of CATEGORIES_CONFIG) {
    const valeurs = rows
      .map((r) => (r.scoreParCategorie as Record<string, number | null> | null)?.[cat.id])
      .filter((v): v is number => typeof v === "number");
    parCategorie[cat.id] = valeurs.length > 0 ? Math.round(valeurs.reduce((a, b) => a + b, 0) / valeurs.length) : null;
  }

  const global = rows.length > 0 ? Math.round(rows.reduce((acc, r) => acc + r.scoreGlobal, 0) / rows.length) : null;

  return { global, parCategorie };
}

/**
 * Statistiques issues de la table anonyme `vulnerabilite_simulations` : total de simulations
 * terminées, répartition par réponse et score moyen — Matomo ne sait pas calculer de moyenne
 * ni agréger des champs de formulaire, cf. ADR sur les stats du simulateur de vulnérabilité.
 */
export async function getVulnerabiliteStatsBdd(periodeId: PeriodeId): Promise<VulnerabiliteStatsBdd> {
  const { debut } = getDateRange(periodeId);
  const rows = await vulnerabiliteSimulationsRepo.findSince(debut);

  return {
    totalSimulations: rows.length,
    reponses: computeReponsesStats(rows),
    scoreMoyen: computeScoreMoyen(rows),
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
    const fin = new Date().toISOString().slice(0, 10);
    const debut = new Date();
    debut.setDate(debut.getDate() - FUNNEL_PERIODE_JOURS);
    const dateRange = `${debut.toISOString().slice(0, 10)},${fin}`;

    const data = await fetchMatomoFunnel(funnelId, "range", dateRange);
    return transformMatomoFunnelData(data);
  } catch (error) {
    console.error("[getVulnerabiliteFunnel] echec Matomo:", error instanceof Error ? error.message : error);
    return null;
  }
}
