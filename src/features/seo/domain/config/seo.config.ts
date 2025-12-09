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
export const COMMUNES_PAR_DEPARTEMENT = 30;

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
