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
    // Le cache est gere par unstable_cache en amont, qui ne memorise pas les erreurs — volontaire :
    // un premier timeout n'empeche pas Matomo de terminer l'archive en tache de fond ; un nouvel
    // essai un peu plus tard (l'archive etant alors prete) doit pouvoir reussir immediatement,
    // pas etre bloque par un echec mis en cache.
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

// Le token est relu ici plutot que passe en argument pour ne pas finir dans la cle de cache.
const fetchMatomoApiCached = unstable_cache(
  async (params: Record<string, string | undefined>, apiUrl: string): Promise<unknown> => {
    const { apiToken } = getMatomoConfig();
    return requestMatomoApi({ ...params, token_auth: apiToken } as MatomoRequestParams, apiUrl);
  },
  ["matomo-api"],
  { revalidate: MATOMO_CACHE_TTL_SECONDS, tags: [MATOMO_CACHE_TAG] }
);

/**
 * Requete générique vers l'API Matomo, avec cache 1 h des seules reponses valides.
 * @param params
 * @param apiUrl
 * @returns
 */
async function fetchMatomoApi<T>(params: MatomoRequestParams, apiUrl: string): Promise<T> {
  const cacheableParams: Record<string, string | undefined> = { ...params, token_auth: undefined };
  return (await fetchMatomoApiCached(cacheableParams, apiUrl)) as T;
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

  // Matomo ne calcule pas toujours les visiteurs uniques (`enable_processing_unique_visitors_range`) :
  // sans metrique, lever plutot que renvoyer 0, indiscernable d'une vraie absence de visites.
  const uniques = Number(data.nb_uniq_visitors);
  if (!Number.isFinite(uniques)) {
    throw new Error("Reponse Matomo inattendue (VisitsSummary.get): nb_uniq_visitors absent ou non numerique");
  }

  return uniques;
}

/**
 * Réponse Events.getAction : un tableau plat en `period=range`, ou un objet keyed par
 * sous-période (ex: "2026-01-05,2026-01-11") quand `period` est `day`/`week`/`month` sur un
 * `date` en plage — même convention que `VisitsSummary.getVisits` (cf. `matomo.service.ts`).
 */
type MatomoEventActionApiResponse = MatomoEventActionResponse[] | Record<string, MatomoEventActionResponse[]>;

/**
 * Cumule les `nb_visits` par label d'event, à travers une ou plusieurs sous-périodes.
 * Un `nb_visits` par event est un comptage, additif entre sous-périodes disjointes —
 * contrairement aux visiteurs uniques, qui exigent une déduplication.
 *
 * Toute anomalie de structure ou de compteur lève au lieu d'être ignorée : un total amputé
 * d'une sous-période est indiscernable d'une vraie baisse une fois affiché.
 */
function sumEventCounts(data: MatomoEventActionApiResponse, methode: string): Map<string, number> {
  const eventCounts = new Map<string, number>();
  const rowsPerPeriode = Array.isArray(data) ? [data] : Object.values(data ?? {});

  for (const rows of rowsPerPeriode) {
    if (!Array.isArray(rows)) {
      throw new Error(`Reponse Matomo inattendue (${methode}): sous-periode non tabulaire`);
    }
    for (const row of rows) {
      // Number(...) : sur une reponse multi-sous-periode, Matomo serialise parfois nb_visits en
      // string — sans conversion, `0 + "234"` concatene ("0234") au lieu d'additionner.
      const valeur = Number(row.nb_visits);
      if (!Number.isFinite(valeur)) {
        throw new Error(`Reponse Matomo inattendue (${methode}): compteur non numerique`);
      }
      eventCounts.set(row.label, (eventCounts.get(row.label) ?? 0) + valeur);
    }
  }

  return eventCounts;
}

/**
 * Récupère les visiteurs uniques par sous-période (ex: 1 point par mois) depuis l'API Matomo
 * (`VisitsSummary.getUniqueVisitors`, métrique unique — pas de risque d'agrégation incorrecte
 * comme `VisitsSummary.get` : chaque sous-période a son propre dédoublonnage, indépendant des
 * autres, donc pas de double-comptage même si un visiteur revient sur plusieurs mois).
 *
 * @param period - Granularité des points : 'day', 'week', 'month'…
 * @param date - Plage au format 'YYYY-MM-DD,YYYY-MM-DD'
 */
export async function fetchMatomoUniqueVisitorsSeries(period: string, date: string): Promise<MatomoVisitsResponse> {
  const config = getMatomoConfig();

  const data = await fetchMatomoApi<Record<string, number | string>>(
    {
      module: "API",
      method: "VisitsSummary.getUniqueVisitors",
      idSite: config.siteId,
      period,
      date,
      format: "JSON",
      token_auth: config.apiToken,
    },
    config.apiUrl
  );

  // Number(...) : sur une réponse multi-sous-période, Matomo peut sérialiser la valeur en string
  // plutôt qu'en nombre (cf. gotcha CLAUDE.md) — jamais utiliser la valeur brute sans conversion.
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, Number(value) || 0]));
}

/**
 * Récupère le nombre d'events Matomo par action (tous départements confondus).
 * Retourne une Map<eventName, count> en un seul appel API.
 *
 * @param options - Période et date. En `day`/`week`/`month` sur une plage, les sous-périodes sont
 *   sommées : passer des plages alignées sur les bornes de bucket (`decouperPeriodeMatomo`).
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

  return sumEventCounts(data, "Events.getAction");
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

  return sumEventCounts(data, "Events.getAction (departement)");
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

  // Number(...) comme dans sumEventCounts : le type annonce un number que le JSON ne garantit pas.
  for (const row of eligibleData) {
    const value = extractDimensionValueFromLabel(row.label);
    if (!value) continue;
    const entry = result.get(value) ?? { total: 0, eligible: 0, nonEligible: 0 };
    entry.eligible += Number(row.nb_visits) || 0;
    entry.total += Number(row.nb_visits) || 0;
    result.set(value, entry);
  }

  for (const row of nonEligibleData) {
    const value = extractDimensionValueFromLabel(row.label);
    if (!value) continue;
    const entry = result.get(value) ?? { total: 0, eligible: 0, nonEligible: 0 };
    entry.nonEligible += Number(row.nb_visits) || 0;
    entry.total += Number(row.nb_visits) || 0;
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
    result.set(value, (result.get(value) ?? 0) + (Number(row.nb_visits) || 0));
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
