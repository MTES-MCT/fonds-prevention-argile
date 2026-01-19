/**
 * Configuration spécifique au cocon SEO
 */

// Réexporter les constantes RGA pour rétrocompatibilité
export {
  DEPARTEMENTS_ELIGIBLES_RGA,
  isDepartementEligible,
  getDepartementEligible,
  getAllDepartementsEligibles,
} from "@/shared/constants/rga.constants";

/**
 * Nombre de communes à générer par département (triées par population)
 */
export const COMMUNES_PAR_DEPARTEMENT = 150;

/**
 * Configuration de l'API Géo
 */
export const API_GEO = {
  baseUrl: "https://geo.api.gouv.fr",
  endpoints: {
    departements: "/departements",
    communes: "/departements/{code}/communes",
    epci: "/epcis",
    communesByEpci: "/epcis/{code}/communes",
  },
  delayBetweenCalls: 300,
} as const;

/**
 * Configuration de l'API Georisques (catastrophes naturelles)
 */
export const API_GEORISQUES = {
  baseUrl: "https://georisques.gouv.fr",
  endpoints: {
    catnat: "/api/v1/gaspar/catnat",
  },
  limits: {
    /** Nombre maximum de codes INSEE par requête */
    maxCodesInsee: 10,
    /** Rayon de recherche maximum en mètres */
    maxRadiusMeters: 10000,
    /** Taille de page par défaut */
    defaultPageSize: 100,
  },
  /** Délai entre les appels API en ms (rate limiting) */
  delayBetweenCalls: 300,
  /** Nombre d'années de catastrophes à récupérer */
  yearsToFetch: 20,
} as const;
