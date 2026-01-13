/**
 * Adapter pour l'API Geo (geo.api.gouv.fr)
 * Utilisé pour enrichir les données d'adresse avec le code EPCI
 *
 * Documentation : https://geo.api.gouv.fr/decoupage-administratif
 */

import type { GeoApiCommuneResponse, GeoEpciData } from "./geo.types";

/**
 * URL de base de l'API Geo
 */
const GEO_API_BASE_URL = "https://geo.api.gouv.fr";

/**
 * Récupère les informations d'une commune par son code INSEE
 *
 * @param codeInsee - Code INSEE de la commune (ex: "54099")
 * @returns Données de la commune incluant le code EPCI
 *
 * @example
 * ```ts
 * const commune = await fetchCommuneByCode("54099");
 * console.log(commune.codeEpci); // "200069433"
 * ```
 */
export async function fetchCommuneByCode(codeInsee: string): Promise<GeoApiCommuneResponse> {
  if (!codeInsee || codeInsee.trim().length < 2) {
    throw new Error("Code INSEE invalide");
  }

  const url = `${GEO_API_BASE_URL}/communes/${codeInsee.trim()}?fields=code,nom,codeEpci,codeDepartement,codeRegion`;

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Commune non trouvée pour le code INSEE: ${codeInsee}`);
    }
    throw new Error(`Erreur API Geo: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Récupère uniquement le code EPCI d'une commune
 *
 * @param codeInsee - Code INSEE de la commune
 * @returns Code EPCI ou null si non disponible
 *
 * @example
 * ```ts
 * const codeEpci = await getEpciByCommune("54099");
 * console.log(codeEpci); // "200069433"
 * ```
 */
export async function getEpciByCommune(codeInsee: string): Promise<string | null> {
  try {
    const commune = await fetchCommuneByCode(codeInsee);
    return commune.codeEpci || null;
  } catch (error) {
    console.error("[Geo API] Erreur récupération EPCI:", error);
    return null;
  }
}

/**
 * Récupère les données EPCI pour le simulateur
 *
 * @param codeInsee - Code INSEE de la commune
 * @returns Données EPCI ou null si non disponible
 */
export async function getEpciDataByCommune(codeInsee: string): Promise<GeoEpciData | null> {
  const codeEpci = await getEpciByCommune(codeInsee);

  if (!codeEpci) {
    return null;
  }

  return { codeEpci };
}
