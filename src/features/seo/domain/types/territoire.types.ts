/**
 * Types pour le cocon sémantique SEO des territoires RGA
 */

/**
 * Département avec données SEO
 */
export interface DepartementSEO {
  /** Code département (ex: "03") */
  code: string;
  nom: string;
  /** Slug URL-friendly (ex: "allier") */
  slug: string;
  population?: number;
  /** Nombre de communes incluses dans le cocon SEO */
  nombreCommunesRGA: number;
  /** Nombre d'EPCI inclus dans le cocon SEO */
  nombreEpciRGA: number;
}

/**
 * Commune avec données SEO
 */
export interface CommuneSEO {
  codeInsee: string;
  nom: string;
  /** Slug URL-friendly avec code INSEE pour unicité (ex: "montlucon-03185") */
  slug: string;
  population: number;
  codeDepartement: string;
  /** Code SIREN de l'EPCI d'appartenance */
  codeEpci?: string;
  /** Nom de l'EPCI d'appartenance */
  nomEpci?: string;
  /** Codes postaux de la commune */
  codesPostaux: string[];
}

/**
 * EPCI (Établissement Public de Coopération Intercommunale) avec données SEO
 */
export interface EpciSEO {
  codeSiren: string;
  nom: string;
  /** Slug URL-friendly avec code SIREN pour unicité */
  slug: string;
  /** Codes des départements couverts par l'EPCI */
  codesDepartements: string[];
  /** Codes INSEE des communes membres (uniquement celles du cocon SEO) */
  codesCommunes: string[];
  /** Population totale de l'EPCI */
  population?: number;
}

/**
 * Données complètes du cocon SEO générées par le script
 */
export interface CoconSEOData {
  generatedAt: string;
  config: {
    communesParDepartement: number;
    departementsEligibles: string[];
  };
  departements: DepartementSEO[];
  communes: CommuneSEO[];
  epci: EpciSEO[];
}

/**
 * Réponse de l'API Géo pour un département
 */
export interface ApiGeoDepartement {
  code: string;
  nom: string;
  codeRegion: string;
}

/**
 * Réponse de l'API Géo pour une commune
 */
export interface ApiGeoCommune {
  code: string;
  nom: string;
  codeDepartement: string;
  codeRegion: string;
  codesPostaux: string[];
  population?: number;
  codeEpci?: string;
}

/**
 * Réponse de l'API Géo pour un EPCI
 */
export interface ApiGeoEpci {
  code: string;
  nom: string;
  codesDepartements: string[];
  population?: number;
}

/**
 * Paramètres pour la génération du slug
 */
export interface SlugOptions {
  /** Suffixe à ajouter (code INSEE, code SIREN) */
  suffix?: string;
  /** Séparateur entre le nom et le suffixe */
  separator?: string;
}
