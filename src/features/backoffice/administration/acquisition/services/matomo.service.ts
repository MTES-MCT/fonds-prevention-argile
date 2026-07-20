import { fetchMatomoVisits, fetchMatomoBounceRate, fetchMatomoUniqueVisitors } from "../adapters/matomo-api.adapter";
import type { MatomoStatistiques, VisiteParJour, GranulariteVisites } from "../domain/types/matomo.types";
import {
  PERIODES,
  SERVICE_START_DATE,
} from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type { PeriodeId } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function computeVariation(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Granularité de `VisitsSummary.getVisits` selon la durée de période.
 * Sur "day", Matomo doit calculer/renvoyer une archive par jour de la plage — jusqu'à ~365
 * archives pour "12m"/"tout", ce qui peut être très lent si elles ne sont pas pré-archivées
 * (même cause que le timeout déjà connu sur les Funnels). On élargit la granularité pour les
 * longues périodes afin de réduire le nombre de sous-archives demandées en un seul appel.
 */
function getGranulariteForPeriode(periodeId?: PeriodeId): GranulariteVisites {
  if (periodeId === "90j" || periodeId === "6m") return "week";
  if (periodeId === "12m" || periodeId === "tout") return "month";
  return "day";
}

/**
 * Récupère les statistiques Matomo pour une période donnée, avec variations
 */
export async function getMatomoStatistiques(periodeId?: PeriodeId, segment?: string): Promise<MatomoStatistiques> {
  const granularite = getGranulariteForPeriode(periodeId);

  try {
    const fin = new Date();
    const periode = periodeId ? PERIODES.find((p) => p.id === periodeId) : null;
    const jours = periode?.jours ?? null;
    const debut = jours ? new Date(fin.getTime() - jours * 86400000) : SERVICE_START_DATE;
    const period = `${formatDate(debut)},${formatDate(fin)}`;

    // Période précédente (même durée, juste avant)
    const hasPrevious = jours !== null;
    const previousPeriod = hasPrevious
      ? `${formatDate(new Date(fin.getTime() - jours * 2 * 86400000))},${formatDate(debut)}`
      : null;

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

    // Transformer les données - La structure est { "date": nombre }
    const visitesParJour: VisiteParJour[] = Object.entries(visitsData).map(([date, visites]) => ({
      date,
      visites: typeof visites === "number" ? visites : 0,
    }));

    // Calculer le total
    const nombreVisitesTotales = visitesParJour.reduce((total, jour) => total + jour.visites, 0);

    // Calculer les variations
    let variationVisites: number | null = null;
    let variationTauxRebond: number | null = null;
    let variationVisiteursUniques: number | null = null;

    if (previousVisitsData) {
      const previousTotal = Object.values(previousVisitsData).reduce(
        (total: number, v) => total + (typeof v === "number" ? v : 0),
        0
      );
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
