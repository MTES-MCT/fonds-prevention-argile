import { getServerEnv, getClientEnv } from "@/shared/config/env.config";
import type { MatomoVisitsResponse } from "../domain/matomo.types";

/**
 * Adapter pour l'API Matomo
 */

/**
 * Récupère les statistiques de visites depuis l'API Matomo
 * @param period - Période : 'day', 'week', 'month', 'year'
 * @param date - Date au format 'YYYY-MM-DD' ou 'last30' pour les 30 derniers jours
 */
export async function fetchMatomoVisits(
  period: string = "day",
  date: string = "last30"
): Promise<MatomoVisitsResponse> {
  const serverEnv = getServerEnv();
  const clientEnv = getClientEnv();

  // Vérifier que les variables Matomo sont définies
  if (
    !clientEnv.NEXT_PUBLIC_MATOMO_SITE_ID ||
    !clientEnv.NEXT_PUBLIC_MATOMO_URL
  ) {
    throw new Error(
      "Configuration Matomo incomplète (SITE_ID ou URL manquant)"
    );
  }

  // Paramètres de la requête en POST
  const params = new URLSearchParams({
    module: "API",
    method: "VisitsSummary.getVisits",
    idSite: clientEnv.NEXT_PUBLIC_MATOMO_SITE_ID,
    period,
    date,
    format: "JSON",
    token_auth: serverEnv.MATOMO_API_TOKEN,
  });

  const response = await fetch(clientEnv.NEXT_PUBLIC_MATOMO_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    next: { revalidate: 3600 }, // Cache 1 heure
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Erreur API Matomo:", errorText);

    throw new Error(
      `Erreur API Matomo: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}
