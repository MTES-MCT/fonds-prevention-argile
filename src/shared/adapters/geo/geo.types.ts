/**
 * Types pour l'API Geo (geo.api.gouv.fr)
 * Documentation : https://geo.api.gouv.fr/decoupage-administratif
 */

/**
 * Réponse de l'API Geo pour une commune
 */
export interface GeoApiCommuneResponse {
  /** Code INSEE de la commune */
  code: string;

  /** Nom de la commune */
  nom: string;

  /** Code SIREN de l'EPCI */
  codeEpci?: string;

  /** Code du département */
  codeDepartement?: string;

  /** Code de la région */
  codeRegion?: string;

  /** Codes postaux */
  codesPostaux?: string[];

  /** Population */
  population?: number;
}

/**
 * Données EPCI extraites pour le simulateur
 */
export interface GeoEpciData {
  /** Code SIREN de l'EPCI */
  codeEpci: string;
}
