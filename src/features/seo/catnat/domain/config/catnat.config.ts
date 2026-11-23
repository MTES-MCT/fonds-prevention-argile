/**
 * Configuration spécifique Catastrophes Naturelles
 */

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
    /** Un lot de 10 communes tient en une page : la pagination de l'API perd des lignes. */
    defaultPageSize: 1000,
  },
  /** Délai entre les appels API en ms (rate limiting) */
  delayBetweenCalls: 300,
} as const;

/**
 * Types de risques liés au RGA (Retrait-Gonflement des Argiles)
 * On ne garde que les sécheresses car elles causent le RGA
 */
export const CATNAT_RGA_TYPES = {
  /**
   * Mots-clés pour identifier les catastrophes liées au RGA
   * (case insensitive)
   */
  keywords: ["sécheresse", "secheresse"] as const,
} as const;
