/**
 * Types pour les statistiques de l'espace AMO
 */

/**
 * Indicateurs clés pour l'AMO
 */
export interface AmoIndicateursCles {
  /** Nb de dossiers en cours d'accompagnement (demande acceptée + statut LOGEMENT_ELIGIBLE) */
  nombreDossiersEnCoursAccompagnement: number;
  /** Nb total de demandes d'accompagnement traitées */
  nombreDemandesAccompagnement: {
    total: number;
    acceptees: number;
    refusees: number;
  };
}

/**
 * Statistiques complètes de l'AMO
 */
export interface AmoStatistiques {
  indicateursCles: AmoIndicateursCles;
}
