import { API_GEORISQUES } from "../../domain/config/catnat.config";
import type {
  ApiGeorisquesCatnat,
  ApiGeorisquesResponse,
  GeorisquesCatnatParams,
  GeorisquesApiError,
} from "./georisques.types";

/**
 * Logger pour les appels API Georisques
 * Activable via DEBUG_SEO=true
 */
function createGeorisquesLogger() {
  const isEnabled = process.env.DEBUG_SEO === "true";

  return {
    log: (...args: unknown[]) => {
      if (isEnabled) {
        console.log("\n[GEORISQUES]", ...args);
      }
    },
    error: (...args: unknown[]) => {
      console.error("\n[GEORISQUES]", ...args);
    },
    progress: (...args: unknown[]) => {
      console.log("\n[GEORISQUES]", ...args);
    },
  };
}

const logger = createGeorisquesLogger();

/**
 * Effectue un appel à l'API Georisques avec gestion d'erreurs
 */
async function fetchGeorisquesApi<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_GEORISQUES.baseUrl}${endpoint}`);

  // Ajouter les paramètres de requête
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
  }

  logger.log(`Fetching: ${url.toString()}`);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorData: GeorisquesApiError = await response.json().catch(() => ({
      response_code: response.status,
      message: response.statusText,
    }));

    throw new Error(`API Georisques error: ${errorData.response_code} - ${errorData.message} for ${url.toString()}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Récupère toutes les lignes d'une requête, et refuse un résultat incomplet.
 */
async function fetchToutesLesPages(codeInsee: string): Promise<ApiGeorisquesCatnat[]> {
  const lignes: ApiGeorisquesCatnat[] = [];
  let annoncees = 0;
  let totalPages = 1;

  for (let page = 1; page <= totalPages; page++) {
    const response = await fetchGeorisquesApi<ApiGeorisquesResponse>(API_GEORISQUES.endpoints.catnat, {
      code_insee: codeInsee,
      page: page.toString(),
      page_size: API_GEORISQUES.limits.defaultPageSize.toString(),
    });

    lignes.push(...response.data);
    annoncees = response.results;
    totalPages = response.total_pages;

    logger.log(`  └─ Page ${page}/${totalPages}: ${response.data.length} catastrophes récupérées`);
  }

  // Géorisques pagine sans ordre stable : d'une page à l'autre, des doublons prennent la place de lignes.
  const recues = totalPages > 1 ? new Set(lignes.map((ligne) => JSON.stringify(ligne))).size : lignes.length;
  if (recues !== annoncees) {
    throw new Error(`Réponse Géorisques incomplète : ${recues} lignes distinctes sur ${annoncees} annoncées`);
  }

  return lignes;
}

/**
 * Récupère les catastrophes naturelles pour un code INSEE
 */
export async function fetchCatnatByCodeInsee(codeInsee: string): Promise<ApiGeorisquesCatnat[]> {
  return fetchToutesLesPages(codeInsee);
}

/**
 * Récupère les catastrophes naturelles pour plusieurs codes INSEE
 * L'API permet max 10 codes à la fois, donc on fait plusieurs appels si nécessaire
 */
export async function fetchCatnatByCodesInsee(codesInsee: string[]): Promise<ApiGeorisquesCatnat[]> {
  if (codesInsee.length === 0) return [];

  const allCatnats: ApiGeorisquesCatnat[] = [];

  logger.progress(`Fetching CATNAT for ${codesInsee.length} communes`);

  for (let i = 0; i < codesInsee.length; i += API_GEORISQUES.limits.maxCodesInsee) {
    const batch = codesInsee.slice(i, i + API_GEORISQUES.limits.maxCodesInsee);
    allCatnats.push(...(await fetchToutesLesPages(batch.join(","))));
  }

  return allCatnats;
}

/**
 * Récupère les catastrophes naturelles avec pagination manuelle
 * Utile pour des tests ou des imports progressifs
 */
export async function fetchCatnatPaginated(params: GeorisquesCatnatParams): Promise<ApiGeorisquesResponse> {
  const queryParams: Record<string, string> = {};

  if (params.code_insee) queryParams.code_insee = params.code_insee;
  if (params.page) queryParams.page = params.page.toString();
  if (params.page_size) queryParams.page_size = params.page_size.toString();
  if (params.latlon) queryParams.latlon = params.latlon;
  if (params.rayon) queryParams.rayon = params.rayon.toString();

  return fetchGeorisquesApi<ApiGeorisquesResponse>(API_GEORISQUES.endpoints.catnat, queryParams);
}
