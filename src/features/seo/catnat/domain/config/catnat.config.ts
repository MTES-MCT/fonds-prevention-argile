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

/**
 * Jeu de données data.gouv des décisions publiées au Journal officiel, refus compris (depuis juillet 2025)
 * https://www.data.gouv.fr/datasets/decisions-de-catastrophe-naturelle-publiees-au-journal-officiel-communes-reconnues-et-refusees/
 */
export const DECISIONS_DATA_GOUV = {
  /** Adresse stable de la ressource : data.gouv redirige vers le fichier du producteur. */
  url: "https://www.data.gouv.fr/api/1/datasets/r/8d707f9b-1ec5-4acc-b58f-2e949ff0f347",
  source: "data.gouv",
  /** Début du libellé officiel du phénomène ; « Mouvements de terrains (hors sécheresse…) » en est un autre. */
  phenomeneSecheresse: "Mouvements de terrain différentiels consécutifs à la sécheresse",
  /** Les décisions antérieures ne sont pas dans le jeu de données. */
  depuis: "juillet 2025",
  delaiMaxMs: 30_000,
} as const;

/** Au-delà, une source est en retard sur l'autre : l'import le signale en erreur. Les arrêtés paraissent environ chaque mois. */
export const RETARD_SOURCE_ALERTE_JOURS = 15;
