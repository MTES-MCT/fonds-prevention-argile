import { FunnelStatistiques } from "./matomo-funnels.types";

/**
 * Statistiques globales de l'application
 */
export interface Statistiques {
  /**
   * Nombre total de comptes créés
   */
  nombreComptesCreés: number;

  /**
   * Nombre total de demandes d'AMO
   */
  nombreDemandesAMO: number;

  /**
   * Nombre de demandes d'AMO en attente de validation
   */
  nombreDemandesAMOEnAttente: number;

  /**
   * Nombre de dossiers Démarches Simplifiées au total
   */
  nombreTotalDossiersDS: number;

  /**
   * Nombre de dossiers Démarches Simplifiées en brouillon
   */
  nombreDossiersDSBrouillon: number;

  /**
   * Nombre de dossiers Démarches Simplifiées envoyés
   */
  nombreDossiersDSEnvoyés: number;

  // === STATISTIQUES MATOMO (Analytics) ===

  /**
   * Nombre total de visites (30 derniers jours)
   */
  nombreVisitesTotales: number;

  /**
   * Nombre de visites par jour (30 derniers jours)
   */
  visitesParJour: VisiteParJour[];

  // === STATISTIQUES FUNNEL ===

  /**
   * Statistiques du funnel "Complétude du simulateur RGA"
   * Null si les données ne sont pas disponibles ou si l'accès est restreint
   */
  funnelSimulateurRGA: FunnelStatistiques | null;
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
   * Nombre de visites ce jour-là
   */
  visites: number;
}
