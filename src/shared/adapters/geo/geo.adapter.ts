/**
 * Adapter pour l'API Geo (geo.api.gouv.fr)
 * Utilisé pour enrichir les données d'adresse avec le code EPCI
 *
 * Documentation : https://geo.api.gouv.fr/decoupage-administratif
 */

import type { GeoApiCommuneResponse, GeoCentreCommune, GeoEpciData } from "./geo.types";

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

interface GeoApiCentreResponse {
  code: string;
  centre?: { type: "Point"; coordinates: [number, number] };
}

/**
 * Centres de toutes les communes d'un département, arrondissements de Paris, Lyon et Marseille compris
 *
 * @param codeDepartement - Code officiel du département (ex: "03", "2A", "974")
 * @throws Si l'API répond en erreur : l'appelant ne doit pas mettre l'échec en cache
 */
export async function fetchCentresCommunesDepartement(codeDepartement: string): Promise<GeoCentreCommune[]> {
  // La BAN renvoie le code de l'arrondissement, que l'API Geo omet par défaut (et toujours sur /departements/…).
  const url = `${GEO_API_BASE_URL}/communes?codeDepartement=${encodeURIComponent(codeDepartement)}&fields=code,centre&type=commune-actuelle,arrondissement-municipal`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erreur API Geo: ${response.status} ${response.statusText}`);
  }

  const communes = (await response.json()) as GeoApiCentreResponse[];
  return communes.flatMap((c) =>
    c.centre ? [{ code: c.code, lon: c.centre.coordinates[0], lat: c.centre.coordinates[1] }] : []
  );
}
