/**
 * Statistiques Matomo (analytics web)
 */
export interface MatomoStatistiques {
  /**
   * Nombre total de visites
   */
  nombreVisitesTotales: number;

  /**
   * Nombre de visites par jour (30 derniers jours)
   */
  visitesParJour: VisiteParJour[];
}

/**
 * Visites pour un jour donné
 */
export interface VisiteParJour {
  /**
   * Date au format YYYY-MM-DD
   */
  date: string;

  /**
   * Nombre de visites ce jour
   */
  visites: number;
}

/**
 * Réponse de l'API Matomo pour les visites
 * Structure : { "2025-11-03": 45, "2025-11-02": 21, ... }
 */
export interface MatomoVisitsResponse {
  [date: string]: number;
}
