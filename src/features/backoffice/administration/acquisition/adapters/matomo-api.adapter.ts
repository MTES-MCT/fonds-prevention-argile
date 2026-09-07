import { unstable_cache } from "next/cache";
import { getServerEnv, getClientEnv } from "@/shared/config/env.config";
import type { MatomoVisitsResponse, MatomoEventActionResponse } from "../domain/types/matomo.types";
import type { MatomoFunnelFlowTableResponse } from "../domain/types/matomo-funnels.types";
import { PARTNER_REFERRERS, type PartnerKey } from "@/shared/domain/partners";

/**
 * Construit un segment Matomo filtrant par referrer (host) pour un partenaire connu.
 */
export function buildPartnerSegment(partner?: PartnerKey | null): string | undefined {
  if (!partner) return undefined;
  const host = PARTNER_REFERRERS[partner];
  if (!host) return undefined;
  return `referrerName==${host}`;
}

/**
 * Combine plusieurs segments Matomo avec ";" (AND logique).
 * Retourne undefined si aucun segment fourni.
 */
export function combineSegments(...segments: (string | undefined | null)[]): string | undefined {
  const valid = segments.filter((s): s is string => Boolean(s));
  if (valid.length === 0) return undefined;
  return valid.join(";");
}

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

const MATOMO_TIMEOUT_MS = 10_000;
const MATOMO_CACHE_TTL_SECONDS = 3600;
export const MATOMO_CACHE_TAG = "matomo-api";

/**
 * Appel HTTP brut vers l'API Matomo, sans cache.
 */
async function requestMatomoApi<T>(params: MatomoRequestParams, apiUrl: string): Promise<T> {
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
    signal: AbortSignal.timeout(MATOMO_TIMEOUT_MS),
    // Le cache HTTP natif est desactive : c'est unstable_cache (fetchMatomoApiCached) qui gere
    // le cache, y compris pour les echecs (cf. son commentaire) — pas de doublon de cache ici.
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Erreur API Matomo (${params.method}):`, errorText);
    throw new Error(`Erreur API Matomo: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Matomo repond HTTP 200 meme sur erreur d'authentification : le verdict est dans le corps.
  if (data?.result === "error") {
    console.error(`Erreur API Matomo (${params.method}):`, data.message);
    throw new Error(`Erreur API Matomo: ${data.message}`);
  }

  return data as T;
}

/** Résultat mis en cache par `fetchMatomoApiCached` — discrimine succès et échec. */
type MatomoCachedOutcome = { ok: true; data: unknown } | { ok: false; message: string };

// Le token est relu ici plutot que passe en argument pour ne pas finir dans la cle de cache.
//
// L'echec est mis en cache au meme titre qu'un succes (meme TTL) : un `period=range` segmente
// par departement sur une longue duree n'est jamais pre-archive par Matomo, donc un timeout se
// reproduit a l'identique tant que l'archive n'existe pas — sans ce cache, chaque nouvelle
// requete (a chaque changement de filtre, chaque rechargement) retente le meme appel couteux et
// attend a nouveau le timeout de 10 s. Avec, la fenetre d'indisponibilite reste la meme, mais
// elle n'est plus payee en repetant l'attente : les appels suivants echouent instantanement
// depuis le cache jusqu'a expiration.
const fetchMatomoApiCached = unstable_cache(
  async (params: Record<string, string | undefined>, apiUrl: string): Promise<MatomoCachedOutcome> => {
    const { apiToken } = getMatomoConfig();
    try {
      const data = await requestMatomoApi({ ...params, token_auth: apiToken } as MatomoRequestParams, apiUrl);
      return { ok: true, data };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : String(error) };
    }
  },
  ["matomo-api"],
  { revalidate: MATOMO_CACHE_TTL_SECONDS, tags: [MATOMO_CACHE_TAG] }
);

/**
 * Requete générique vers l'API Matomo, avec cache 1 h (succès et échec, cf. `fetchMatomoApiCached`).
 * @param params
 * @param apiUrl
 * @returns
 */
async function fetchMatomoApi<T>(params: MatomoRequestParams, apiUrl: string): Promise<T> {
  const cacheableParams: Record<string, string | undefined> = { ...params, token_auth: undefined };
  const outcome = await fetchMatomoApiCached(cacheableParams, apiUrl);
  if (!outcome.ok) {
    throw new Error(outcome.message);
  }
  return outcome.data as T;
}

/**
 * Récupère les statistiques de visites depuis l'API Matomo
 * @param period - Période : 'day', 'week', 'month', 'year'
 * @param date - Date au format 'YYYY-MM-DD' ou 'last30' pour les 30 derniers jours
 */
export async function fetchMatomoVisits(
  period: string = "day",
  date: string = "last30",
  segment?: string
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
      segment,
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
export async function fetchMatomoBounceRate(
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
 * Réponse Events.getAction : un tableau plat en `period=range`, ou un objet keyed par
 * sous-période (ex: "2026-01-05,2026-01-11") quand `period` est `day`/`week`/`month` sur un
 * `date` en plage — même convention que `VisitsSummary.getVisits` (cf. `matomo.service.ts`).
 */
type MatomoEventActionApiResponse = MatomoEventActionResponse[] | Record<string, MatomoEventActionResponse[]>;

/**
 * Cumule les `nb_visits` par label d'event, à travers une ou plusieurs sous-périodes.
 * `nb_visits` par event est un comptage — additif, contrairement aux visiteurs uniques
 * (déduplication), donc sommer les sous-périodes ne fausse pas le total.
 */
function sumEventCounts(data: MatomoEventActionApiResponse): Map<string, number> {
  const eventCounts = new Map<string, number>();
  const rowsPerPeriode = Array.isArray(data) ? [data] : Object.values(data ?? {});

  for (const rows of rowsPerPeriode) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      eventCounts.set(row.label, (eventCounts.get(row.label) ?? 0) + row.nb_visits);
    }
  }

  return eventCounts;
}

/**
 * Récupère le nombre d'events Matomo par action (tous départements confondus).
 * Retourne une Map<eventName, count> en un seul appel API.
 *
 * @param options - Période et date optionnelles. `period` peut être `day`/`week`/`month` avec
 *   un `date` en plage pour éviter le calcul live d'un `range` non pré-archivé sur une longue
 *   durée (cf. `getGranulariteForPeriode`) — un comptage d'events est additif, donc sans risque
 *   à sommer entre sous-périodes.
 */
export async function fetchMatomoEvents(options?: {
  period?: string;
  date?: string;
  segment?: string;
}): Promise<Map<string, number>> {
  const config = getMatomoConfig();

  const data = await fetchMatomoApi<MatomoEventActionApiResponse>(
    {
      module: "API",
      method: "Events.getAction",
      idSite: config.siteId,
      period: options?.period ?? "range",
      date: options?.date ?? "2025-01-01,today",
      format: "JSON",
      token_auth: config.apiToken,
      flat: "1",
      segment: options?.segment,
    },
    config.apiUrl
  );

  return sumEventCounts(data);
}

/**
 * Récupère le nombre d'events Matomo par action, filtré par département via Custom Dimension.
 * Retourne une Map<eventName, count> en un seul appel API.
 *
 * @param codeDepartement - Code département (ex: "36")
 * @param dimensionId - ID de la Custom Dimension département configurée dans Matomo
 * @param options - Période et date optionnelles (cf. `fetchMatomoEvents` pour la granularité)
 */
export async function fetchMatomoEventsByDepartment(
  codeDepartement: string,
  dimensionId: number,
  options?: { period?: string; date?: string; extraSegment?: string }
): Promise<Map<string, number>> {
  const config = getMatomoConfig();
  const baseSegment = `dimension${dimensionId}==${codeDepartement}`;
  const segment = combineSegments(baseSegment, options?.extraSegment) ?? baseSegment;

  const data = await fetchMatomoApi<MatomoEventActionApiResponse>(
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

  return sumEventCounts(data);
}

// ---------------------------------------------------------------------------
// Simulations groupées par Custom Dimension via CustomDimensions API
// ---------------------------------------------------------------------------

interface MatomoCustomDimensionRow {
  label: string; // valeur composite "valeur - url" pour dimensions de scope action
  nb_visits: number;
}

/**
 * Extrait la valeur de dimension depuis un label Matomo CustomDimension.
 * Les dimensions de scope "action" retournent des labels comme "63 - fonds-prevention-argile.beta.gouv.fr/simulateur".
 * On extrait la partie avant " - " qui est la valeur de la dimension.
 */
function extractDimensionValueFromLabel(label: string): string | null {
  if (!label || label === "-") return null;
  const dashIndex = label.indexOf(" - ");
  const value = dashIndex > 0 ? label.substring(0, dashIndex).trim() : label.trim();
  return value || null;
}

/** Un seul appel `CustomDimensions.getCustomDimension`, segmenté par `eventActionSegment`. */
async function fetchMatomoDimensionRows(
  dimensionId: number,
  eventActionSegment: string,
  options?: { period?: string; date?: string; extraSegment?: string }
): Promise<MatomoCustomDimensionRow[]> {
  const config = getMatomoConfig();

  const data = await fetchMatomoApi<MatomoCustomDimensionRow[]>(
    {
      module: "API",
      method: "CustomDimensions.getCustomDimension",
      idDimension: String(dimensionId),
      idSite: config.siteId,
      period: options?.period ?? "range",
      date: options?.date ?? "2025-01-01,today",
      format: "JSON",
      token_auth: config.apiToken,
      flat: "1",
      segment: combineSegments(eventActionSegment, options?.extraSegment) ?? "",
    },
    config.apiUrl
  );

  return Array.isArray(data) ? data : [];
}

/**
 * Récupère les simulations Matomo ventilées par une Custom Dimension (département, commune, etc.).
 * Fait 2 appels segmentés (éligible + non éligible) et fusionne les résultats.
 *
 * @param dimensionId - ID de la Custom Dimension dans Matomo
 * @param options - Période et date optionnelles
 * @returns Map<dimensionValue, { total, eligible, nonEligible }>
 */
export async function fetchMatomoSimulationsGroupedByDimension(
  dimensionId: number,
  options?: { period?: string; date?: string; extraSegment?: string }
): Promise<Map<string, { total: number; eligible: number; nonEligible: number }>> {
  const [eligibleData, nonEligibleData] = await Promise.all([
    fetchMatomoDimensionRows(dimensionId, "eventAction==simulateur_result_eligible", options),
    fetchMatomoDimensionRows(dimensionId, "eventAction==simulateur_result_non_eligible", options),
  ]);

  const result = new Map<string, { total: number; eligible: number; nonEligible: number }>();

  for (const row of eligibleData) {
    const value = extractDimensionValueFromLabel(row.label);
    if (!value) continue;
    const entry = result.get(value) ?? { total: 0, eligible: 0, nonEligible: 0 };
    entry.eligible += row.nb_visits;
    entry.total += row.nb_visits;
    result.set(value, entry);
  }

  for (const row of nonEligibleData) {
    const value = extractDimensionValueFromLabel(row.label);
    if (!value) continue;
    const entry = result.get(value) ?? { total: 0, eligible: 0, nonEligible: 0 };
    entry.nonEligible += row.nb_visits;
    entry.total += row.nb_visits;
    result.set(value, entry);
  }

  return result;
}

/**
 * Récupère un comptage Matomo ventilé par Custom Dimension, pour un seul event (pas de
 * distinction éligible/non-éligible) — utilisé par le simulateur de vulnérabilité, qui n'a
 * qu'un seul type de résultat (`vulnerabilite_result`).
 *
 * @param dimensionId - ID de la Custom Dimension dans Matomo (réutilise la même dimension
 *   département que le simulateur d'éligibilité : le filtre `eventActionSegment` garantit
 *   qu'aucune visite de l'autre simulateur ne s'y mélange).
 * @param eventActionSegment - ex: "eventAction==vulnerabilite_result"
 */
export async function fetchMatomoCountByDimension(
  dimensionId: number,
  eventActionSegment: string,
  options?: { period?: string; date?: string; extraSegment?: string }
): Promise<Map<string, number>> {
  const rows = await fetchMatomoDimensionRows(dimensionId, eventActionSegment, options);

  const result = new Map<string, number>();
  for (const row of rows) {
    const value = extractDimensionValueFromLabel(row.label);
    if (!value) continue;
    result.set(value, (result.get(value) ?? 0) + row.nb_visits);
  }
  return result;
}

/**
 * Alias pour la rétrocompatibilité — récupère les simulations groupées par département.
 */
export async function fetchMatomoSimulationsGroupedByDepartment(
  dimensionId: number,
  options?: { period?: string; date?: string; extraSegment?: string }
): Promise<Map<string, { total: number; eligible: number; nonEligible: number }>> {
  return fetchMatomoSimulationsGroupedByDimension(dimensionId, options);
}
