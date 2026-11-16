import { unstable_cache } from "next/cache";
import { getServerEnv, getClientEnv } from "@/shared/config/env.config";
import type { MatomoVisitsResponse, MatomoEventActionResponse } from "../domain/types/matomo.types";
import type { MatomoFunnelFlowTableResponse } from "../domain/types/matomo-funnels.types";
import { PARTNER_REFERRERS, type PartnerKey } from "@/shared/domain/partners";
import { estPlageStable } from "../domain/plage-matomo";
import type { CompteurSimulations } from "../domain/simulations-departement";
import { classerEchecReseau, formaterJournalAppel, type IssueAppelMatomo } from "../domain/journal-appel-matomo";

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
const TTL_PLAGE_OUVERTE_SECONDES = 3600;
const TTL_PLAGE_STABLE_SECONDES = 24 * 3600;
export const MATOMO_CACHE_TAG = "matomo-api";

let appelsEnCours = 0;

/**
 * Appel HTTP brut vers l'API Matomo, sans cache. Journalise chaque appel (duree, issue).
 */
async function requestMatomoApi<T>(params: MatomoRequestParams, apiUrl: string): Promise<T> {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined)
  ) as Record<string, string>;

  const searchParams = new URLSearchParams(filteredParams);

  appelsEnCours += 1;
  const simultanes = appelsEnCours;
  const debut = performance.now();
  let issue: IssueAppelMatomo = "ok";

  try {
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
    }).catch((error: unknown) => {
      issue = classerEchecReseau(error);
      throw error;
    });

    if (!response.ok) {
      issue = "erreur_http";
      const errorText = await response.text();
      console.error(`Erreur API Matomo (${params.method}):`, errorText);
      throw new Error(`Erreur API Matomo: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Matomo repond HTTP 200 meme sur erreur d'authentification : le verdict est dans le corps.
    if (data?.result === "error") {
      issue = "erreur_matomo";
      console.error(`Erreur API Matomo (${params.method}):`, data.message);
      throw new Error(`Erreur API Matomo: ${data.message}`);
    }

    return data as T;
  } finally {
    appelsEnCours -= 1;
    const ligne = formaterJournalAppel({
      methode: params.method,
      period: params.period,
      date: params.date,
      segment: params.segment,
      simultanes,
      dureeMs: performance.now() - debut,
      issue,
    });
    if (issue === "ok") console.info(ligne);
    else console.warn(ligne);
  }
}

/** Reduction appliquee avant mise en cache : Next n'ecrit pas une entree de plus de 2 Mo. */
type ReductionReponse = "label-visites";

function reduireLignes(lignes: unknown): unknown {
  if (!Array.isArray(lignes)) return lignes;
  return (lignes as { label?: unknown; nb_visits?: unknown }[]).map((ligne) => ({
    label: ligne?.label,
    nb_visits: ligne?.nb_visits,
  }));
}

/** Ne garde que `label` et `nb_visits` de chaque ligne, sur un tableau ou un objet de sous-periodes. */
function reduireReponse(data: unknown): unknown {
  if (Array.isArray(data) || data === null || typeof data !== "object") return reduireLignes(data);
  return Object.fromEntries(Object.entries(data).map(([cle, lignes]) => [cle, reduireLignes(lignes)]));
}

// Le token est relu ici plutot que passe en argument pour ne pas finir dans la cle de cache.
async function appelerMatomo(
  params: Record<string, string | undefined>,
  apiUrl: string,
  reduction?: ReductionReponse
): Promise<unknown> {
  const { apiToken } = getMatomoConfig();
  const data = await requestMatomoApi({ ...params, token_auth: apiToken } as MatomoRequestParams, apiUrl);
  return reduction === "label-visites" ? reduireReponse(data) : data;
}

const fetchMatomoApiCached = unstable_cache(appelerMatomo, ["matomo-api"], {
  revalidate: TTL_PLAGE_OUVERTE_SECONDES,
  tags: [MATOMO_CACHE_TAG],
});

// Cle distincte : une reponse prise quand la plage etait encore ouverte ne doit pas heriter des 24 h.
const fetchMatomoApiCachedStable = unstable_cache(appelerMatomo, ["matomo-api", "plage-stable"], {
  revalidate: TTL_PLAGE_STABLE_SECONDES,
  tags: [MATOMO_CACHE_TAG],
});

const appelsEnVol = new Map<string, Promise<unknown>>();

/**
 * Requete vers l'API Matomo : reponses valides en cache 24 h si la plage est close, 1 h sinon.
 * Deux demandes identiques en cours partagent le meme appel.
 */
async function fetchMatomoApi<T>(
  params: MatomoRequestParams,
  apiUrl: string,
  reduction?: ReductionReponse
): Promise<T> {
  const cacheableParams: Record<string, string | undefined> = { ...params, token_auth: undefined };
  const cle = JSON.stringify([cacheableParams, apiUrl, reduction ?? null]);

  const enVol = appelsEnVol.get(cle);
  if (enVol) return enVol as Promise<T>;

  const appelCache = estPlageStable(params.date) ? fetchMatomoApiCachedStable : fetchMatomoApiCached;
  const appel = appelCache(cacheableParams, apiUrl, reduction).finally(() => appelsEnVol.delete(cle));
  appelsEnVol.set(cle, appel);
  return appel as Promise<T>;
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
  [key: string]: unknown;
}

/** Visites et rebonds d'une plage : additifs entre sous-periodes, contrairement au taux. */
export interface CompteurRebond {
  visites: number;
  rebonds: number;
}

function lireCompteurRebond(valeur: unknown): number {
  if (valeur === undefined) return 0;
  const nombre = Number(valeur);
  if (!Number.isFinite(nombre)) {
    throw new Error("Reponse Matomo inattendue (VisitsSummary.get): compteur non numerique");
  }
  return nombre;
}

function sumBounceCounts(data: unknown): CompteurRebond {
  if (!data || typeof data !== "object") {
    throw new Error("Reponse Matomo inattendue (VisitsSummary.get): reponse non structuree");
  }
  // En `range` Matomo renvoie la ligne seule, sinon un objet indexe par sous-periode.
  const lignes: unknown[] = "nb_visits" in data || "bounce_count" in data ? [data] : Object.values(data);
  const cumul: CompteurRebond = { visites: 0, rebonds: 0 };

  for (const ligne of lignes) {
    // Une sous-periode sans visite revient en tableau vide.
    if (Array.isArray(ligne) && ligne.length === 0) continue;
    if (!ligne || typeof ligne !== "object" || Array.isArray(ligne)) {
      throw new Error("Reponse Matomo inattendue (VisitsSummary.get): sous-periode non structuree");
    }
    const { nb_visits, bounce_count } = ligne as Record<string, unknown>;
    cumul.visites += lireCompteurRebond(nb_visits);
    cumul.rebonds += lireCompteurRebond(bounce_count);
  }

  return cumul;
}

/**
 * Recupere visites et rebonds (VisitsSummary.get) pour une sous-periode alignee.
 * @param period - 'day', 'week' ou 'month' (cf. `decouperPeriodeMatomo`)
 * @param date - Plage au format 'YYYY-MM-DD,YYYY-MM-DD'
 */
export async function fetchMatomoBounceCounts(period: string, date: string, segment?: string): Promise<CompteurRebond> {
  const config = getMatomoConfig();

  const data = await fetchMatomoApi<unknown>(
    {
      module: "API",
      method: "VisitsSummary.get",
      idSite: config.siteId,
      period,
      date,
      format: "JSON",
      token_auth: config.apiToken,
      segment,
      showColumns: "nb_visits,bounce_count",
    },
    config.apiUrl
  );

  return sumBounceCounts(data);
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
  const data = await requestVisitsSummary(period, date, segment);

  return data.nb_uniq_visitors ?? 0;
}

/**
 * Meme appel, mais leve si Matomo n'a pas calcule la metrique
 * (`enable_processing_unique_visitors_range` desactive) au lieu de renvoyer 0, indiscernable
 * d'une vraie absence de visites. Reserve aux appelants qui savent afficher « Indisponible ».
 */
export async function fetchMatomoUniqueVisitorsStrict(
  period: string = "range",
  date: string = "last30",
  segment?: string
): Promise<number> {
  const data = await requestVisitsSummary(period, date, segment);

  const uniques = Number(data.nb_uniq_visitors);
  if (!Number.isFinite(uniques)) {
    throw new Error("Reponse Matomo inattendue (VisitsSummary.get): nb_uniq_visitors absent ou non numerique");
  }

  return uniques;
}

function requestVisitsSummary(period: string, date: string, segment?: string): Promise<MatomoVisitsSummaryResponse> {
  const config = getMatomoConfig();

  return fetchMatomoApi<MatomoVisitsSummaryResponse>(
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
  // plutôt qu'en nombre (cf. gotcha CLAUDE.md). Une valeur non numérique lève plutôt que de
  // retomber sur 0, qui se lirait comme un mois réellement sans visiteur.
  return Object.fromEntries(
    Object.entries(data).map(([cle, valeur]) => {
      const nombre = Number(valeur);
      if (!Number.isFinite(nombre)) {
        throw new Error(`Reponse Matomo inattendue (VisitsSummary.getUniqueVisitors): valeur non numerique (${cle})`);
      }
      return [cle, nombre];
    })
  );
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
  label: string;
  nb_visits: number | string;
}

/** Tableau en `period=range`, objet indexé par sous-période en `day`/`week`/`month` sur une plage. */
type MatomoDimensionApiResponse = MatomoCustomDimensionRow[] | Record<string, MatomoCustomDimensionRow[]>;

const METHODE_DIMENSION = "CustomDimensions.getCustomDimension";

/**
 * Extrait la valeur de dimension d'un label. Tolère l'ancien format à plat « valeur - url ».
 */
function extractDimensionValueFromLabel(label: string): string | null {
  if (!label || label === "-") return null;
  const dashIndex = label.indexOf(" - ");
  const value = dashIndex > 0 ? label.substring(0, dashIndex).trim() : label.trim();
  return value || null;
}

interface OptionsRapportDimension {
  period?: string;
  date?: string;
  extraSegment?: string;
}

/**
 * Cumule `nb_visits` par valeur de dimension, sur une ou plusieurs sous-périodes disjointes.
 * Toute anomalie lève : un total amputé d'une sous-période se lirait comme une vraie baisse.
 */
function sumDimensionCounts(data: MatomoDimensionApiResponse): Map<string, number> {
  const cumul = new Map<string, number>();
  const lignesParPeriode = Array.isArray(data) ? [data] : Object.values(data ?? {});

  for (const lignes of lignesParPeriode) {
    if (!Array.isArray(lignes)) {
      throw new Error(`Reponse Matomo inattendue (${METHODE_DIMENSION}): sous-periode non tabulaire`);
    }
    for (const ligne of lignes) {
      const valeur = extractDimensionValueFromLabel(ligne.label);
      if (!valeur) continue;
      const visites = Number(ligne.nb_visits);
      if (!Number.isFinite(visites)) {
        throw new Error(`Reponse Matomo inattendue (${METHODE_DIMENSION}): compteur non numerique`);
      }
      cumul.set(valeur, (cumul.get(valeur) ?? 0) + visites);
    }
  }

  return cumul;
}

/**
 * Comptage Matomo ventilé par Custom Dimension pour un event (`eventActionSegment`), toutes
 * valeurs comprises. En `day`/`week`/`month` sur une plage, les sous-périodes sont sommées.
 */
export async function fetchMatomoCountByDimension(
  dimensionId: number,
  eventActionSegment: string,
  options?: OptionsRapportDimension
): Promise<Map<string, number>> {
  const config = getMatomoConfig();

  const data = await fetchMatomoApi<MatomoDimensionApiResponse>(
    {
      module: "API",
      method: METHODE_DIMENSION,
      idDimension: String(dimensionId),
      idSite: config.siteId,
      period: options?.period ?? "range",
      date: options?.date ?? "2025-01-01,today",
      format: "JSON",
      token_auth: config.apiToken,
      // Sans `flat` : mêmes totaux par valeur, sans la sous-table d'URL que Matomo chargeait pour chacune.
      showColumns: "nb_visits",
      // Matomo s'arrête à 100 lignes par défaut : les communes en comptent des milliers.
      filter_limit: "-1",
      segment: combineSegments(eventActionSegment, options?.extraSegment) ?? "",
    },
    config.apiUrl,
    "label-visites"
  );

  return sumDimensionCounts(data);
}

/**
 * Simulations Matomo ventilées par une Custom Dimension (département, commune) : deux appels
 * segmentés, éligible et non éligible, fusionnés par valeur.
 */
export async function fetchMatomoSimulationsGroupedByDimension(
  dimensionId: number,
  options?: OptionsRapportDimension
): Promise<Map<string, CompteurSimulations>> {
  const [eligibles, nonEligibles] = await Promise.all([
    fetchMatomoCountByDimension(dimensionId, "eventAction==simulateur_result_eligible", options),
    fetchMatomoCountByDimension(dimensionId, "eventAction==simulateur_result_non_eligible", options),
  ]);

  const result = new Map<string, CompteurSimulations>();
  for (const valeur of new Set([...eligibles.keys(), ...nonEligibles.keys()])) {
    const eligible = eligibles.get(valeur) ?? 0;
    const nonEligible = nonEligibles.get(valeur) ?? 0;
    result.set(valeur, { total: eligible + nonEligible, eligible, nonEligible });
  }
  return result;
}
