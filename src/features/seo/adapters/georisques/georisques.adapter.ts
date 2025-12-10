import { API_GEORISQUES } from "../../domain/config/seo.config";
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
        console.log("[GEORISQUES]", ...args);
      }
    },
    error: (...args: unknown[]) => {
      console.error("[GEORISQUES]", ...args);
    },
    progress: (...args: unknown[]) => {
      console.log("[GEORISQUES]", ...args);
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
 * Récupère les catastrophes naturelles pour un code INSEE
 * Gère automatiquement la pagination pour récupérer tous les résultats
 */
export async function fetchCatnatByCodeInsee(codeInsee: string): Promise<ApiGeorisquesCatnat[]> {
  const allCatnats: ApiGeorisquesCatnat[] = [];
  let currentPage = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const params: Record<string, string> = {
      code_insee: codeInsee,
      page: currentPage.toString(),
      page_size: API_GEORISQUES.limits.defaultPageSize.toString(),
    };

    const response = await fetchGeorisquesApi<ApiGeorisquesResponse>(API_GEORISQUES.endpoints.catnat, params);

    allCatnats.push(...response.data);

    logger.log(`  └─ Page ${currentPage}/${response.total_pages}: ${response.data.length} catastrophes récupérées`);

    // Vérifier s'il y a d'autres pages
    hasMorePages = currentPage < response.total_pages;
    currentPage++;
  }

  return allCatnats;
}

/**
 * Récupère les catastrophes naturelles pour plusieurs codes INSEE
 * L'API permet max 10 codes à la fois, donc on fait plusieurs appels si nécessaire
 */
export async function fetchCatnatByCodesInsee(codesInsee: string[]): Promise<ApiGeorisquesCatnat[]> {
  if (codesInsee.length === 0) return [];

  const allCatnats: ApiGeorisquesCatnat[] = [];

  // Diviser en lots de 10 codes max
  const batches: string[][] = [];
  for (let i = 0; i < codesInsee.length; i += API_GEORISQUES.limits.maxCodesInsee) {
    batches.push(codesInsee.slice(i, i + API_GEORISQUES.limits.maxCodesInsee));
  }

  logger.progress(`Fetching CATNAT for ${codesInsee.length} communes in ${batches.length} batches`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const codeInseeBatch = batch.join(",");

    logger.log(`  └─ Batch ${i + 1}/${batches.length}: ${batch.length} communes`);

    const params: Record<string, string> = {
      code_insee: codeInseeBatch,
      page_size: API_GEORISQUES.limits.defaultPageSize.toString(),
    };

    const response = await fetchGeorisquesApi<ApiGeorisquesResponse>(API_GEORISQUES.endpoints.catnat, params);

    allCatnats.push(...response.data);

    logger.log(`      ${response.results} catastrophes récupérées`);
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
