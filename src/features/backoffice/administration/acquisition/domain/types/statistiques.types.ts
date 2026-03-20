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
   * Nombre total de visites
   */
  nombreVisitesTotales: number;

  /**
   * Variation du nombre de visites vs période précédente (en %, null si non calculable)
   */
  variationVisites: number | null;

  /**
   * Nombre de visites par jour
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
