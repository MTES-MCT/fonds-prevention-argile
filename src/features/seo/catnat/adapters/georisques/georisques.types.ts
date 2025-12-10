/**
 * Types pour l'API Georisques - Catastrophes Naturelles
 * Documentation: https://www.georisques.gouv.fr/doc-api#/CATNAT
 */

/**
 * Réponse de l'API Georisques pour une catastrophe naturelle
 */
export interface ApiGeorisquesCatnat {
  code_national_catnat: string;
  date_debut_evt: string; // Format: "DD/MM/YYYY"
  date_fin_evt: string; // Format: "DD/MM/YYYY"
  date_publication_arrete: string; // Format: "DD/MM/YYYY"
  date_publication_jo: string; // Format: "DD/MM/YYYY"
  libelle_risque_jo: string;
  code_insee: string;
  libelle_commune: string;
}

/**
 * Réponse paginée de l'API Georisques
 */
export interface ApiGeorisquesResponse {
  results: number;
  page: number;
  total_pages: number;
  data: ApiGeorisquesCatnat[];
  response_code: number;
  message: string;
  next: string | null;
  previous: string | null;
}

/**
 * Paramètres de requête pour l'API Georisques
 */
export interface GeorisquesCatnatParams {
  /** Code(s) INSEE de la commune, séparés par des virgules (max 10) */
  code_insee?: string;
  /** Numéro de la page */
  page?: number;
  /** Taille des pages */
  page_size?: number;
  /** Point de recherche (longitude,latitude) */
  latlon?: string;
  /** Rayon de recherche en mètres (max 10000) */
  rayon?: number;
}

/**
 * Erreur API Georisques
 */
export interface GeorisquesApiError {
  response_code: number;
  message: string;
}
