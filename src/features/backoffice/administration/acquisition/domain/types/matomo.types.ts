/**
 * Granularité des points de `visitesParJour`, adaptée à la durée de la période
 * pour éviter de demander à Matomo une archive par jour sur de longues plages
 * (cf. gotcha "Matomo timeout sur périodes longues").
 */
export type GranulariteVisites = "day" | "week" | "month";

/**
 * Statistiques Matomo (analytics web)
 */
export interface MatomoStatistiques {
  /**
   * Nombre total de visites (sessions)
   */
  nombreVisitesTotales: number;

  /**
   * Variation du nombre de visites vs période précédente (en %, null si non calculable)
   */
  variationVisites: number | null;

  /**
   * Nombre de visiteurs uniques (dédupliqués)
   */
  visiteursUniques: number;

  /**
   * Variation des visiteurs uniques vs période précédente (en %, null si non calculable)
   */
  variationVisiteursUniques: number | null;

  /**
   * Nombre de visites par point temporel (granularité selon `granulariteVisites`)
   */
  visitesParJour: VisiteParJour[];

  /**
   * Granularité effective des points de `visitesParJour`
   */
  granulariteVisites: GranulariteVisites;

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
