/**
 * Types pour l'API BAN (Base Adresse Nationale) - IGN Géoplateforme
 * Documentation : https://geoservices.ign.fr/documentation/services/services-geoplateforme/geocodage
 * Ancienne doc : https://adresse.data.gouv.fr/api-doc/adresse
 */

/**
 * Propriétés d'une adresse retournée par l'API BAN
 */
export interface BanFeatureProperties {
  /** Libellé complet de l'adresse (ex: "91 Rue de Notz 36000 Châteauroux") */
  label: string;

  /** Score de pertinence (0 à 1) */
  score: number;

  /** Identifiant unique BAN (clef d'interopérabilité) */
  id: string;

  /** Type de résultat : housenumber, street, locality, municipality */
  type: "housenumber" | "street" | "locality" | "municipality";

  /** Nom de la rue ou du lieu-dit */
  name: string;

  /** Code postal */
  postcode: string;

  /** Code INSEE de la commune */
  citycode: string;

  /** Nom de la commune */
  city: string;

  /** Contexte géographique (ex: "36, Indre, Centre-Val de Loire") */
  context: string;

  /** Numéro de rue (si type = housenumber) */
  housenumber?: string;

  /** Nom de la rue (si type = housenumber) */
  street?: string;

  /** Importance du lieu (pour le tri) */
  importance?: number;

  /** Code INSEE de l'ancienne commune (si fusion) */
  oldcitycode?: string;

  /** Nom de l'ancienne commune (si fusion) */
  oldcity?: string;

  /** District (pour Paris, Lyon, Marseille) */
  district?: string;
}

/**
 * Géométrie GeoJSON d'une adresse (Point)
 */
export interface BanFeatureGeometry {
  type: "Point";
  /** Coordonnées [longitude, latitude] */
  coordinates: [number, number];
}

/**
 * Feature GeoJSON représentant une adresse
 */
export interface BanFeature {
  type: "Feature";
  geometry: BanFeatureGeometry;
  properties: BanFeatureProperties;
}

/**
 * Réponse de l'API de recherche d'adresses
 */
export interface BanSearchResponse {
  type: "FeatureCollection";
  version: string;
  features: BanFeature[];
  /** Attribution (licence) */
  attribution: string;
  /** Licence des données */
  licence: string;
  /** Requête originale */
  query: string;
  /** Nombre de résultats */
  limit: number;
}

/**
 * Options de recherche d'adresse
 */
export interface BanSearchOptions {
  /** Nombre maximum de résultats (défaut: 5, max: 100) */
  limit?: number;

  /** Filtrer par type de résultat */
  type?: "housenumber" | "street" | "locality" | "municipality";

  /** Filtrer par code postal */
  postcode?: string;

  /** Filtrer par code INSEE de commune */
  citycode?: string;

  /** Coordonnées pour privilégier les résultats proches [lon, lat] */
  lat?: number;
  lon?: number;
}

/**
 * Coordonnées extraites d'une adresse BAN
 */
export interface BanCoordinates {
  lat: number;
  lon: number;
}

/**
 * Données extraites d'une adresse BAN pour le simulateur
 */
export interface BanAddressData {
  /** Libellé complet de l'adresse */
  label: string;

  /** Identifiant unique BAN (clef d'interopérabilité) */
  clefBan: string;

  /** Code INSEE de la commune */
  codeCommune: string;

  /** Nom de la commune */
  nomCommune: string;

  /** Code postal */
  codePostal: string;

  /** Code département (extrait du context) */
  codeDepartement: string;

  /** Code région (extrait du context) */
  codeRegion: string;

  /** Code EPCI (récupéré via API Geo) */
  codeEpci?: string;

  /** Coordonnées */
  coordinates: BanCoordinates;
}
