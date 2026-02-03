import type { BanSearchResponse, BanSearchOptions, BanFeature, BanAddressData, BanCoordinates } from "./ban.types";

/**
 * URL de base de l'API BAN (IGN Géoplateforme)
 * Migration depuis l'ancienne API DINUM (mars 2025)
 */
const BAN_API_BASE_URL = "https://data.geopf.fr/geocodage";

/**
 * Nombre de résultats par défaut
 */
const DEFAULT_LIMIT = 5;

/**
 * Longueur minimum de la requête pour lancer une recherche
 */
export const MIN_QUERY_LENGTH = 5;

/**
 * Recherche d'adresses via l'API BAN
 *
 * @param query - Texte de recherche (adresse partielle ou complète)
 * @param options - Options de recherche
 * @returns Liste des adresses trouvées
 *
 * @example
 * ```ts
 * const results = await searchAddress("91 rue de notz châteauroux");
 * console.log(results[0].properties.label);
 * // "91 Rue de Notz 36000 Châteauroux"
 * ```
 */
export async function searchAddress(query: string, options: BanSearchOptions = {}): Promise<BanFeature[]> {
  if (!query || query.trim().length < MIN_QUERY_LENGTH) {
    return [];
  }

  const { limit = DEFAULT_LIMIT, type, postcode, citycode, lat, lon } = options;

  // Construire l'URL avec les paramètres
  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
  });

  if (type) params.append("type", type);
  if (postcode) params.append("postcode", postcode);
  if (citycode) params.append("citycode", citycode);
  if (lat !== undefined) params.append("lat", String(lat));
  if (lon !== undefined) params.append("lon", String(lon));

  const url = `${BAN_API_BASE_URL}/search?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erreur API BAN: ${response.status} ${response.statusText}`);
  }

  const data: BanSearchResponse = await response.json();

  return data.features;
}

/**
 * Mapping des codes région par département
 * Source: https://www.insee.fr/fr/information/2114819
 */
const DEPARTEMENT_TO_REGION: Record<string, string> = {
  // Auvergne-Rhône-Alpes (84)
  "01": "84",
  "03": "84",
  "07": "84",
  "15": "84",
  "26": "84",
  "38": "84",
  "42": "84",
  "43": "84",
  "63": "84",
  "69": "84",
  "73": "84",
  "74": "84",
  // Bourgogne-Franche-Comté (27)
  "21": "27",
  "25": "27",
  "39": "27",
  "58": "27",
  "70": "27",
  "71": "27",
  "89": "27",
  "90": "27",
  // Bretagne (53)
  "22": "53",
  "29": "53",
  "35": "53",
  "56": "53",
  // Centre-Val de Loire (24)
  "18": "24",
  "28": "24",
  "36": "24",
  "37": "24",
  "41": "24",
  "45": "24",
  // Corse (94)
  "2A": "94",
  "2B": "94",
  // Grand Est (44)
  "08": "44",
  "10": "44",
  "51": "44",
  "52": "44",
  "54": "44",
  "55": "44",
  "57": "44",
  "67": "44",
  "68": "44",
  "88": "44",
  // Hauts-de-France (32)
  "02": "32",
  "59": "32",
  "60": "32",
  "62": "32",
  "80": "32",
  // Île-de-France (11)
  "75": "11",
  "77": "11",
  "78": "11",
  "91": "11",
  "92": "11",
  "93": "11",
  "94": "11",
  "95": "11",
  // Normandie (28)
  "14": "28",
  "27": "28",
  "50": "28",
  "61": "28",
  "76": "28",
  // Nouvelle-Aquitaine (75)
  "16": "75",
  "17": "75",
  "19": "75",
  "23": "75",
  "24": "75",
  "33": "75",
  "40": "75",
  "47": "75",
  "64": "75",
  "79": "75",
  "86": "75",
  "87": "75",
  // Occitanie (76)
  "09": "76",
  "11": "76",
  "12": "76",
  "30": "76",
  "31": "76",
  "32": "76",
  "34": "76",
  "46": "76",
  "48": "76",
  "65": "76",
  "66": "76",
  "81": "76",
  "82": "76",
  // Pays de la Loire (52)
  "44": "52",
  "49": "52",
  "53": "52",
  "72": "52",
  "85": "52",
  // Provence-Alpes-Côte d'Azur (93)
  "04": "93",
  "05": "93",
  "06": "93",
  "13": "93",
  "83": "93",
  "84": "93",
  // DOM-TOM
  "971": "01",
  "972": "02",
  "973": "03",
  "974": "04",
  "976": "06",
};

/**
 * Extrait le code département depuis le context BAN
 *
 * @param context - Contexte géographique (ex: "36, Indre, Centre-Val de Loire")
 * @returns Code département (ex: "36")
 */
export function extractDepartementFromContext(context: string): string {
  const match = context.match(/^(\d{2,3}[AB]?)/);
  return match ? match[1] : "";
}

/**
 * Obtient le code région à partir du code département
 *
 * @param codeDepartement - Code département
 * @returns Code région
 */
export function getRegionFromDepartement(codeDepartement: string): string {
  return DEPARTEMENT_TO_REGION[codeDepartement] || "";
}

/**
 * Extrait les coordonnées d'une feature BAN
 *
 * @param feature - Feature BAN
 * @returns Coordonnées { lat, lon }
 */
export function extractCoordinates(feature: BanFeature): BanCoordinates {
  const [lon, lat] = feature.geometry.coordinates;
  return { lat, lon };
}

/**
 * Options pour le mapping d'adresse BAN
 */
export interface MapBanFeatureOptions {
  /** Code EPCI (récupéré via API Geo) */
  codeEpci?: string;
}

/**
 * Convertit une feature BAN en données d'adresse pour le simulateur
 *
 * @param feature - Feature BAN sélectionnée
 * @param options - Options additionnelles (codeEpci, etc.)
 * @returns Données d'adresse formatées
 */
export function mapBanFeatureToAddressData(feature: BanFeature, options: MapBanFeatureOptions = {}): BanAddressData {
  const { properties, geometry } = feature;
  const codeDepartement = extractDepartementFromContext(properties.context);
  const codeRegion = getRegionFromDepartement(codeDepartement);
  const [lon, lat] = geometry.coordinates;

  return {
    label: properties.label,
    clefBan: properties.id,
    codeCommune: properties.citycode,
    nomCommune: properties.city,
    codePostal: properties.postcode,
    codeDepartement,
    codeRegion,
    codeEpci: options.codeEpci,
    coordinates: { lat, lon },
  };
}

/**
 * Formate les coordonnées en chaîne pour stockage
 *
 * @param coordinates - Coordonnées { lat, lon }
 * @returns Chaîne "lat,lon"
 */
export function formatCoordinatesString(coordinates: BanCoordinates): string {
  return `${coordinates.lat},${coordinates.lon}`;
}
