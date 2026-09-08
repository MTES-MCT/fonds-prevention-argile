import { fetchMatomoVisits, fetchMatomoBounceRate, fetchMatomoUniqueVisitors } from "../adapters/matomo-api.adapter";
import type { MatomoStatistiques, VisiteParJour, GranulariteVisites } from "../domain/types/matomo.types";
import { formaterDateMatomo } from "../domain/decoupage-periode";
import {
  getFenetrePeriode,
  getFenetrePeriodePrecedente,
  type FenetrePeriode,
} from "@/features/backoffice/administration/tableau-de-bord/domain/periode-window";
import type { PeriodeId } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

function formaterPlage(fenetre: FenetrePeriode): string {
  return `${formaterDateMatomo(fenetre.debut)},${formaterDateMatomo(fenetre.dernierJour)}`;
}

function computeVariation(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Granularité à utiliser pour toute requête Matomo additive (comptages : visites, events…)
 * selon la durée de période, en remplacement de `period=range`. Un `range` n'est jamais
 * pré-archivé par Matomo — recalculé en live à chaque appel, pire cas quand un segment
 * (département) est appliqué. `day`/`week`/`month` sur une plage lisent des archives
 * pré-calculées, sommables sans perte pour un comptage (contrairement aux visiteurs uniques,
 * qui nécessitent une vraie déduplication et restent donc en `range`, cf. `getUniqueVisitors`).
 * On élargit la granularité sur les longues périodes pour limiter le nombre de sous-archives
 * demandées en un seul appel (même cause que le timeout déjà connu sur les Funnels).
 */
export function getGranulariteForPeriode(periodeId?: PeriodeId): GranulariteVisites {
  if (periodeId === "90j" || periodeId === "6m") return "week";
  if (periodeId === "12m" || periodeId === "tout") return "month";
  return "day";
}

/**
 * Extrait une date exploitable par `new Date(...)` d'une clé Matomo.
 * En `period=day`, la clé est une date simple ("2026-01-05"). En `period=week`/`month`
 * sur un `date=range`, Matomo renvoie la sous-période sous forme "début,fin"
 * ("2026-01-05,2026-01-11") — sans cette extraction, `new Date("2026-01-05,2026-01-11")`
 * vaut "Invalid Date" et casse le tri/l'affichage du graphique.
 */
function extractDateDebut(matomoDateKey: string): string {
  return matomoDateKey.split(",")[0];
}

/**
 * Récupère les statistiques Matomo pour une période donnée, avec variations
 */
export async function getMatomoStatistiques(periodeId?: PeriodeId, segment?: string): Promise<MatomoStatistiques> {
  const granularite = getGranulariteForPeriode(periodeId);

  try {
    const fenetre = getFenetrePeriode(periodeId);
    const fenetrePrecedente = getFenetrePeriodePrecedente(periodeId);
    const period = formaterPlage(fenetre);
    const previousPeriod = fenetrePrecedente ? formaterPlage(fenetrePrecedente) : null;

    // Récupérer les visites + visiteurs uniques + taux de rebond en parallele (période courante + précédente)
    const [visitsData, tauxRebond, uniqueVisitors, previousVisitsData, previousTauxRebond, previousUniqueVisitors] =
      await Promise.all([
        fetchMatomoVisits(granularite, period, segment),
        fetchMatomoBounceRate("range", period, segment),
        fetchMatomoUniqueVisitors("range", period, segment),
        previousPeriod ? fetchMatomoVisits(granularite, previousPeriod, segment) : Promise.resolve(null),
        previousPeriod ? fetchMatomoBounceRate("range", previousPeriod, segment) : Promise.resolve(null),
        previousPeriod ? fetchMatomoUniqueVisitors("range", previousPeriod, segment) : Promise.resolve(0),
      ]);

    // Structure : { "date": nombre } (day) ou { "début,fin": nombre } (week/month).
    // Number(...) : Matomo sérialise parfois la valeur en string, et `typeof === "number"`
    // la remplaçait alors silencieusement par 0.
    // Limite connue : en week/month les buckets de bord débordent de la fenêtre, donc le total
    // ci-dessous la dépasse un peu. Assumé pour une courbe de tendance — le découpage exact
    // (decouperPeriodeMatomo) mêlerait des points jour et semaine sur le même graphique.
    const visitesParJour: VisiteParJour[] = Object.entries(visitsData).map(([date, visites]) => {
      const nombre = Number(visites);
      return { date: extractDateDebut(date), visites: Number.isFinite(nombre) ? nombre : 0 };
    });

    // Calculer le total
    const nombreVisitesTotales = visitesParJour.reduce((total, jour) => total + jour.visites, 0);

    // Calculer les variations
    let variationVisites: number | null = null;
    let variationTauxRebond: number | null = null;
    let variationVisiteursUniques: number | null = null;

    if (previousVisitsData) {
      const previousTotal = Object.values(previousVisitsData).reduce((total: number, v) => {
        const nombre = Number(v);
        return total + (Number.isFinite(nombre) ? nombre : 0);
      }, 0);
      variationVisites = computeVariation(nombreVisitesTotales, previousTotal);
    }

    if (previousTauxRebond !== null) {
      variationTauxRebond = Math.round(tauxRebond - previousTauxRebond);
    }

    if (previousUniqueVisitors && previousUniqueVisitors > 0) {
      variationVisiteursUniques = computeVariation(uniqueVisitors, previousUniqueVisitors);
    }

    return {
      nombreVisitesTotales,
      variationVisites,
      visiteursUniques: uniqueVisitors,
      variationVisiteursUniques,
      visitesParJour,
      granulariteVisites: granularite,
      tauxRebond,
      variationTauxRebond,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des stats Matomo:", error);

    return {
      nombreVisitesTotales: 0,
      variationVisites: null,
      visiteursUniques: 0,
      variationVisiteursUniques: null,
      visitesParJour: [],
      granulariteVisites: granularite,
      tauxRebond: 0,
      variationTauxRebond: null,
    };
  }
}
