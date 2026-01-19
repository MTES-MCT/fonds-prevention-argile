/**
 * Types pour les funnels de conversion Matomo
 */

/**
 * Réponse brute de l'API Matomo pour une étape du funnel
 */
export interface MatomoFunnelStepResponse {
  label: string;
  step_nb_visits: number;
  step_nb_proceeded: number;
  step_nb_exits: number | string;
  step_proceeded_rate: string;
  step_exited_rate: string;
  step_position: number;
  step_definition: string;
  customLabel: string;
  Actions: number;
  isVisitorLogEnabled: boolean;
}

/**
 * Réponse de l'API Matomo pour un funnel (tableau d'étapes)
 */
export interface MatomoFunnelResponse {
  funnel_sum_entries?: number;
  funnel_sum_exits?: number;
  funnel_nb_conversions?: number;
  funnel_conversion_rate?: string;
  funnel_abandoned_rate?: string;
}

/**
 * Réponse de l'API Matomo pour le tableau détaillé du funnel
 */
export type MatomoFunnelFlowTableResponse = MatomoFunnelStepResponse[];

/**
 * Une étape du funnel de conversion (transformée)
 */
export interface FunnelStep {
  /**
   * Nom de l'étape
   */
  nom: string;

  /**
   * Position de l'étape dans le funnel (1-based)
   */
  position: number;

  /**
   * Nombre de visiteurs ayant atteint cette étape
   */
  visiteurs: number;

  /**
   * Nombre de visiteurs passant à l'étape suivante
   */
  conversions: number;

  /**
   * Taux de conversion vers l'étape suivante (en pourcentage)
   */
  tauxConversion: number;

  /**
   * Nombre d'abandons à cette étape
   */
  abandons: number;

  /**
   * Taux d'abandon à cette étape (en pourcentage)
   */
  tauxAbandon: number;
}

/**
 * Statistiques du funnel de conversion 
 */
export interface FunnelStatistiques {
  /**
   * Liste des étapes du funnel
   */
  etapes: FunnelStep[];

  /**
   * Nombre de visiteurs à la première étape
   */
  visiteursInitiaux: number;

  /**
   * Nombre de visiteurs ayant complété tout le funnel
   */
  conversionsFinales: number;

  /**
   * Taux de conversion global de bout en bout (en pourcentage)
   */
  tauxConversionGlobal: number;
}
