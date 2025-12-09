import { getServerEnv, getClientEnv } from "@/shared/config/env.config";
import type { MatomoVisitsResponse } from "../domain/types/matomo.types";
import type { MatomoFunnelFlowTableResponse } from "../domain/types/matomo-funnels.types";

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
  if (!clientEnv.NEXT_PUBLIC_MATOMO_SITE_ID || !clientEnv.NEXT_PUBLIC_MATOMO_URL) {
    throw new Error("Configuration Matomo incomplète (SITE_ID ou URL manquant)");
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

    throw new Error(`Erreur API Matomo: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Récupère les statistiques d'un funnel depuis l'API Matomo Mes Aides Réno
 * @param funnelId - ID du funnel à récupérer
 * @param period - Période : 'day', 'week', 'month', 'year', 'range'
 * @param date - Date au format 'YYYY-MM-DD' ou plage 'YYYY-MM-DD,YYYY-MM-DD'
 */
export async function fetchMatomoFunnel(
  funnelId: string,
  period: string = "range",
  date: string = "2025-10-16,today"
): Promise<MatomoFunnelFlowTableResponse> {
  const serverEnv = getServerEnv();
  const clientEnv = getClientEnv();

  if (!clientEnv.NEXT_PUBLIC_MATOMO_URL) {
    throw new Error("Configuration Matomo incomplète (URL manquant)");
  }

  const MATOMO_MES_AIDES_RENO_SITE_ID = serverEnv.MATOMO_MES_AIDES_RENO_SITE_ID;
  const MATOMO_MES_AIDES_RENO_API_TOKEN = serverEnv.MATOMO_MES_AIDES_RENO_API_TOKEN;

  // Paramètres de la requête en POST
  const params = new URLSearchParams({
    module: "API",
    method: "Funnels.getFunnelFlowTable",
    idSite: MATOMO_MES_AIDES_RENO_SITE_ID,
    idFunnel: funnelId,
    period,
    date,
    format: "JSON",
    token_auth: MATOMO_MES_AIDES_RENO_API_TOKEN,
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
    console.error("Erreur API Matomo Funnel:", errorText);

    throw new Error(`Erreur API Matomo Funnel: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
