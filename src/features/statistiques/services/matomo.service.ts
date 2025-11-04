import { fetchMatomoVisits } from "../adapters/matomo-api.adapter";
import type { MatomoStatistiques, VisiteParJour } from "../domain/matomo.types";

// Date d'ouverture du service
const DATE_OUVERTURE = "2025-10-16";

/**
 * Récupère les statistiques Matomo depuis l'ouverture du service
 */
export async function getMatomoStatistiques(): Promise<MatomoStatistiques> {
  try {
    // Calculer la plage de dates depuis l'ouverture jusqu'à aujourd'hui
    const dateDebut = DATE_OUVERTURE;
    const dateFin = new Date().toISOString().split("T")[0]; // Format YYYY-MM-DD
    const period = `${dateDebut},${dateFin}`;

    // Récupérer les visites depuis l'ouverture
    const visitsData = await fetchMatomoVisits("day", period);

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
