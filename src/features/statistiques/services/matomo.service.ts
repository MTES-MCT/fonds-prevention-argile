import { fetchMatomoVisits } from "../adapters/matomo-api.adapter";
import type { MatomoStatistiques, VisiteParJour } from "../domain/matomo.types";

/**
 * Récupère les statistiques Matomo
 */
export async function getMatomoStatistiques(): Promise<MatomoStatistiques> {
  try {
    // Récupérer les visites des 30 derniers jours
    const visitsData = await fetchMatomoVisits("day", "last30");

    // Transformer les données - La structure est { "date": nombre }
    const visitesParJour: VisiteParJour[] = Object.entries(visitsData).map(
      ([date, visites]) => ({
        date,
        visites: typeof visites === "number" ? visites : 0,
      })
    );

    // Calculer le total
    const nombreVisitesTotales = visitesParJour.reduce(
      (total, jour) => total + jour.visites,
      0
    );

    return {
      nombreVisitesTotales,
      visitesParJour,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des stats Matomo:", error);

    // Retourner des valeurs par défaut en cas d'erreur
    return {
      nombreVisitesTotales: 0,
      visitesParJour: [],
    };
  }
}
