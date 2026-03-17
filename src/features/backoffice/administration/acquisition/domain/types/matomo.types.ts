/**
 * Statistiques Matomo (analytics web)
 */
export interface MatomoStatistiques {
  /**
   * Nombre total de visites
   */
  nombreVisitesTotales: number;

  /**
   * Variation du nombre de visites vs période précédente (en %, null si non calculable)
   */
  variationVisites: number | null;

  /**
   * Nombre de visites par jour (30 derniers jours)
   */
  visitesParJour: VisiteParJour[];

  /**
   * Taux de rebond global (en pourcentage, ex: 45 pour 45%)
   */
  tauxRebond: number;

  /**
   * Variation du taux de rebond vs période précédente (en points, null si non calculable)
   */
  variationTauxRebond: number | null;
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

/**
 * Réponse de l'API Matomo Events.getAction
 * Chaque entrée représente une action d'event avec ses compteurs
 */
export interface MatomoEventActionResponse {
  /** Nom de l'action (= eventName envoyé via trackEvent) */
  label: string;
  /** Nombre total d'events */
  nb_events: number;
  /** Nombre de visites ayant déclenché cet event */
  nb_visits: number;
}
