/**
 * Fonctions d'appel aux APIs Géo pour récupérer les données territoriales
 * API Documentation: https://geo.api.gouv.fr/decoupage-administratif
 */

import { API_GEO, ApiGeoCommune, ApiGeoDepartement, ApiGeoEpci } from "../domain";

/**
 * Logger pour les scripts SEO
 * Activable via DEBUG_SEO=true
 */
function createSeoLogger() {
  const isEnabled = process.env.DEBUG_SEO === "true";

  const createLogMethod = (level: "log" | "error" | "warn" | "info") => {
    return (...args: unknown[]) => {
      if (isEnabled) {
        console[level]("[SEO]", ...args);
      }
    };
  };

  // Les erreurs sont toujours affichées
  const errorMethod = (...args: unknown[]) => {
    console.error("[SEO]", ...args);
  };

  return {
    log: createLogMethod("log"),
    info: createLogMethod("info"),
    warn: createLogMethod("warn"),
    error: errorMethod,
    progress: (...args: unknown[]) => {
      console.log("[SEO]", ...args);
    },
  };
}

export const logger = createSeoLogger();

/**
 * Effectue un appel à l'API Géo avec gestion d'erreurs
 */
async function fetchGeoApi<T>(endpoint: string): Promise<T> {
  const url = `${API_GEO.baseUrl}${endpoint}`;
  logger.log(`Fetching: ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API Géo error: ${response.status} ${response.statusText} for ${url}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Récupère les informations d'un département
 */
export async function fetchDepartement(code: string): Promise<ApiGeoDepartement> {
  return fetchGeoApi<ApiGeoDepartement>(`/departements/${code}`);
}

/**
 * Récupère toutes les communes d'un département avec leur population et centre
 */
export async function fetchCommunesByDepartement(codeDepartement: string): Promise<ApiGeoCommune[]> {
  const endpoint = `/departements/${codeDepartement}/communes?fields=code,nom,codeDepartement,codeRegion,codesPostaux,population,codeEpci,centre`;
  return fetchGeoApi<ApiGeoCommune[]>(endpoint);
}

/**
 * Récupère les informations d'un EPCI par son code SIREN (avec centre)
 */
export async function fetchEpci(codeSiren: string): Promise<ApiGeoEpci> {
  const endpoint = `/epcis/${codeSiren}?fields=code,nom,codesDepartements,population,centre`;
  return fetchGeoApi<ApiGeoEpci>(endpoint);
}

/**
 * Récupère les communes membres d'un EPCI
 */
export async function fetchCommunesByEpci(codeSiren: string): Promise<ApiGeoCommune[]> {
  const endpoint = `/epcis/${codeSiren}/communes?fields=code,nom,codeDepartement,population`;
  return fetchGeoApi<ApiGeoCommune[]>(endpoint);
}

/**
 * Récupère tous les EPCI de France (pour filtrage ultérieur)
 * Note: Cette requête peut être lourde, à utiliser avec précaution
 */
export async function fetchAllEpcis(): Promise<ApiGeoEpci[]> {
  const endpoint = `/epcis?fields=code,nom,codesDepartements,population`;
  return fetchGeoApi<ApiGeoEpci[]>(endpoint);
}
