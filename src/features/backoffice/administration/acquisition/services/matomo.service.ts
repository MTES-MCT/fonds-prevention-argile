import { fetchMatomoVisits, fetchMatomoBounceRate } from "../adapters/matomo-api.adapter";
import type { MatomoStatistiques, VisiteParJour } from "../domain/types/matomo.types";
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
 * Récupère les statistiques Matomo pour une période donnée, avec variations
 */
export async function getMatomoStatistiques(periodeId?: PeriodeId): Promise<MatomoStatistiques> {
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

    // Récupérer les visites + taux de rebond en parallele (période courante + précédente)
    const [visitsData, tauxRebond, previousVisitsData, previousTauxRebond] = await Promise.all([
      fetchMatomoVisits("day", period),
      fetchMatomoBounceRate("range", period),
      previousPeriod ? fetchMatomoVisits("day", previousPeriod) : Promise.resolve(null),
      previousPeriod ? fetchMatomoBounceRate("range", previousPeriod) : Promise.resolve(null),
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

    return {
      nombreVisitesTotales,
      variationVisites,
      visitesParJour,
      tauxRebond,
      variationTauxRebond,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des stats Matomo:", error);

    return {
      nombreVisitesTotales: 0,
      variationVisites: null,
      visitesParJour: [],
      tauxRebond: 0,
      variationTauxRebond: null,
    };
  }
}
