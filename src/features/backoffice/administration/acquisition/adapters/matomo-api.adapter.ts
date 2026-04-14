import { getServerEnv, getClientEnv } from "@/shared/config/env.config";
import type { MatomoVisitsResponse, MatomoEventActionResponse } from "../domain/types/matomo.types";
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
  segment?: string;
  flat?: string;
  [key: string]: string | undefined;
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
 * Reponse de l'API Matomo VisitsSummary.get (resume des visites)
 */
interface MatomoVisitsSummaryResponse {
  nb_visits: number;
  nb_uniq_visitors: number;
  bounce_rate: string; // ex: "45%"
  [key: string]: unknown;
}

/**
 * Recupere le taux de rebond depuis l'API Matomo
 * @param period - Periode : 'range', 'day', etc.
 * @param date - Plage au format 'YYYY-MM-DD,YYYY-MM-DD'
 */
export async function fetchMatomoBounceRate(period: string = "range", date: string = "last30"): Promise<number> {
  const config = getMatomoConfig();

  const data = await fetchMatomoApi<MatomoVisitsSummaryResponse>(
    {
      module: "API",
      method: "VisitsSummary.get",
      idSite: config.siteId,
      period,
      date,
      format: "JSON",
      token_auth: config.apiToken,
    },
    config.apiUrl
  );

  // bounce_rate est une string comme "45%" — on extrait le nombre
  const bounceStr = data.bounce_rate ?? "0%";
  return parseFloat(bounceStr.replace("%", "")) || 0;
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

/**
 * Recupere le nombre de visiteurs uniques depuis l'API Matomo (VisitsSummary.get).
 * @param period - Periode : 'range', 'day', etc.
 * @param date - Plage au format 'YYYY-MM-DD,YYYY-MM-DD'
 * @param segment - Segment Matomo optionnel (ex: "dimension1==36") pour filtrer par departement
 */
export async function fetchMatomoUniqueVisitors(
  period: string = "range",
  date: string = "last30",
  segment?: string
): Promise<number> {
  const config = getMatomoConfig();

  const data = await fetchMatomoApi<MatomoVisitsSummaryResponse>(
    {
      module: "API",
      method: "VisitsSummary.get",
      idSite: config.siteId,
      period,
      date,
      format: "JSON",
      token_auth: config.apiToken,
      segment,
    },
    config.apiUrl
  );

  return data.nb_uniq_visitors ?? 0;
}

/**
 * Récupère le nombre d'events Matomo par action (tous départements confondus).
 * Retourne une Map<eventName, count> en un seul appel API.
 *
 * @param options - Période et date optionnelles
 */
export async function fetchMatomoEvents(options?: { period?: string; date?: string }): Promise<Map<string, number>> {
  const config = getMatomoConfig();

  const data = await fetchMatomoApi<MatomoEventActionResponse[]>(
    {
      module: "API",
      method: "Events.getAction",
      idSite: config.siteId,
      period: options?.period ?? "range",
      date: options?.date ?? "2025-01-01,today",
      format: "JSON",
      token_auth: config.apiToken,
      flat: "1",
    },
    config.apiUrl
  );

  const eventCounts = new Map<string, number>();
  if (Array.isArray(data)) {
    for (const row of data) {
      eventCounts.set(row.label, row.nb_visits);
    }
  }
  return eventCounts;
}

/**
 * Récupère le nombre d'events Matomo par action, filtré par département via Custom Dimension.
 * Retourne une Map<eventName, count> en un seul appel API.
 *
 * @param codeDepartement - Code département (ex: "36")
 * @param dimensionId - ID de la Custom Dimension département configurée dans Matomo
 * @param options - Période et date optionnelles
 */
export async function fetchMatomoEventsByDepartment(
  codeDepartement: string,
  dimensionId: number,
  options?: { period?: string; date?: string }
): Promise<Map<string, number>> {
  const config = getMatomoConfig();
  const segment = `dimension${dimensionId}==${codeDepartement}`;

  const data = await fetchMatomoApi<MatomoEventActionResponse[]>(
    {
      module: "API",
      method: "Events.getAction",
      idSite: config.siteId,
      period: options?.period ?? "range",
      date: options?.date ?? "2025-01-01,today",
      format: "JSON",
      token_auth: config.apiToken,
      segment,
      flat: "1",
    },
    config.apiUrl
  );

  const eventCounts = new Map<string, number>();

  // Matomo peut retourner un tableau vide ou un objet vide si pas de données
  if (Array.isArray(data)) {
    for (const row of data) {
      eventCounts.set(row.label, row.nb_visits);
    }
  }

  return eventCounts;
}

// ---------------------------------------------------------------------------
// Simulations groupées par département via CustomDimensions
// ---------------------------------------------------------------------------

interface MatomoCustomDimensionRow {
  label: string; // valeur de la dimension (ex: "36", "75")
  nb_visits: number;
}

/**
 * Extrait le code département depuis un label Matomo CustomDimension.
 * La dimension de scope "action" retourne des labels comme "63 - fonds-prevention-argile.beta.gouv.fr/simulateur".
 * On extrait la partie avant " - " qui est la valeur de la dimension (le code département).
 */
function extractDeptCodeFromLabel(label: string): string | null {
  if (!label || label === "-") return null;
  const dashIndex = label.indexOf(" - ");
  const code = dashIndex > 0 ? label.substring(0, dashIndex).trim() : label.trim();
  // Vérifier que c'est bien un code département (1 à 3 caractères alphanumériques)
  if (/^[0-9]{1,3}[A-B]?$/i.test(code)) return code;
  return null;
}

/**
 * Récupère les simulations Matomo ventilées par département via `CustomDimensions.getCustomDimension`.
 * Fait 2 appels segmentés (éligible + non éligible) et fusionne les résultats.
 *
 * @param dimensionId - ID de la Custom Dimension département dans Matomo
 * @param options - Période et date optionnelles
 * @returns Map<codeDepartement, { total, eligible, nonEligible }>
 */
export async function fetchMatomoSimulationsGroupedByDepartment(
  dimensionId: number,
  options?: { period?: string; date?: string }
): Promise<Map<string, { total: number; eligible: number; nonEligible: number }>> {
  const config = getMatomoConfig();

  const baseParams = {
    module: "API",
    method: "CustomDimensions.getCustomDimension",
    idDimension: String(dimensionId),
    idSite: config.siteId,
    period: options?.period ?? "range",
    date: options?.date ?? "2025-01-01,today",
    format: "JSON",
    token_auth: config.apiToken,
    flat: "1",
  };

  const [eligibleData, nonEligibleData] = await Promise.all([
    fetchMatomoApi<MatomoCustomDimensionRow[]>(
      { ...baseParams, segment: "eventAction==simulateur_result_eligible" },
      config.apiUrl
    ),
    fetchMatomoApi<MatomoCustomDimensionRow[]>(
      { ...baseParams, segment: "eventAction==simulateur_result_non_eligible" },
      config.apiUrl
    ),
  ]);

  const result = new Map<string, { total: number; eligible: number; nonEligible: number }>();

  for (const row of Array.isArray(eligibleData) ? eligibleData : []) {
    const code = extractDeptCodeFromLabel(row.label);
    if (!code) continue;
    const entry = result.get(code) ?? { total: 0, eligible: 0, nonEligible: 0 };
    entry.eligible += row.nb_visits;
    entry.total += row.nb_visits;
    result.set(code, entry);
  }

  for (const row of Array.isArray(nonEligibleData) ? nonEligibleData : []) {
    const code = extractDeptCodeFromLabel(row.label);
    if (!code) continue;
    const entry = result.get(code) ?? { total: 0, eligible: 0, nonEligible: 0 };
    entry.nonEligible += row.nb_visits;
    entry.total += row.nb_visits;
    result.set(code, entry);
  }

  return result;
}
