import { getServerEnv, getClientEnv } from "@/shared/config/env.config";
import type { MatomoVisitsResponse } from "../domain/types/matomo.types";
import type { MatomoFunnelFlowTableResponse } from "../domain/types/matomo-funnels.types";

/**
 * Adapter pour l'API Matomo
 */

// Configuration Matomo
interface MatomoConfig {
  siteId: string;
  apiUrl: string;
  apiToken: string;
  funnelId?: string;
}

// Paramètres de requête vers l'API Matomo
interface MatomoRequestParams {
  module: string;
  method: string;
  idSite: string;
  period: string;
  date: string;
  format: string;
  token_auth: string;
  idFunnel?: string;
}

/**
 * Récupère la configuration Matomo depuis les variables d'environnement
 * @returns
 */
function getMatomoConfig(): MatomoConfig {
  const serverEnv = getServerEnv();
  const clientEnv = getClientEnv();

  const siteId = clientEnv.NEXT_PUBLIC_MATOMO_SITE_ID;
  const apiUrl = clientEnv.NEXT_PUBLIC_MATOMO_URL;
  const apiToken = serverEnv.MATOMO_API_TOKEN;
  const funnelId = clientEnv.NEXT_PUBLIC_MATOMO_FUNNEL_ID;

  if (!siteId || !apiUrl) {
    throw new Error("Configuration Matomo incomplète (SITE_ID ou URL manquant)");
  }

  if (!apiToken) {
    throw new Error("Configuration Matomo incomplète (API_TOKEN manquant)");
  }

  return {
    siteId,
    apiUrl,
    apiToken,
    funnelId,
  };
}

/**
 * Requete générique vers l'API Matomo
 * @param params
 * @param apiUrl
 * @returns
 */
async function fetchMatomoApi<T>(params: MatomoRequestParams, apiUrl: string): Promise<T> {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined)
  ) as Record<string, string>;

  const searchParams = new URLSearchParams(filteredParams);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: searchParams.toString(),
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Erreur API Matomo (${params.method}):`, errorText);
    throw new Error(`Erreur API Matomo: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data?.result === "error") {
    console.error(`Erreur API Matomo (${params.method}):`, data.message);
    throw new Error(`Erreur API Matomo: ${data.message}`);
  }

  return data as T;
}

/**
 * Récupère les statistiques de visites depuis l'API Matomo
 * @param period - Période : 'day', 'week', 'month', 'year'
 * @param date - Date au format 'YYYY-MM-DD' ou 'last30' pour les 30 derniers jours
 */
export async function fetchMatomoVisits(
  period: string = "day",
  date: string = "last30"
): Promise<MatomoVisitsResponse> {
  const config = getMatomoConfig();

  return fetchMatomoApi<MatomoVisitsResponse>(
    {
      module: "API",
      method: "VisitsSummary.getVisits",
      idSite: config.siteId,
      period,
      date,
      format: "JSON",
      token_auth: config.apiToken,
    },
    config.apiUrl
  );
}

/**
 * Récupère les statistiques d'un funnel depuis l'API Matomo
 * @param funnelId - ID du funnel à récupérer (optionnel, utilise NEXT_PUBLIC_MATOMO_FUNNEL_ID par défaut)
 * @param period - Période : 'day', 'week', 'month', 'year', 'range'
 * @param date - Date au format 'YYYY-MM-DD' ou plage 'YYYY-MM-DD,YYYY-MM-DD'
 */
export async function fetchMatomoFunnel(
  funnelId?: string,
  period: string = "range",
  date: string = "2025-01-01,today"
): Promise<MatomoFunnelFlowTableResponse> {
  const config = getMatomoConfig();

  const effectiveFunnelId = funnelId || config.funnelId;

  if (!effectiveFunnelId) {
    throw new Error("Configuration Matomo incomplète (FUNNEL_ID manquant)");
  }

  return fetchMatomoApi<MatomoFunnelFlowTableResponse>(
    {
      module: "API",
      method: "Funnels.getFunnelFlowTable",
      idSite: config.siteId,
      idFunnel: effectiveFunnelId,
      period,
      date,
      format: "JSON",
      token_auth: config.apiToken,
    },
    config.apiUrl
  );
}
