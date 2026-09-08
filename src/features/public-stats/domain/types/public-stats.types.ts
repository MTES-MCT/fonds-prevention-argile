/** Chiffres cumulés depuis le lancement du service, affichés en cartes en tête de page. */
export interface PublicStatsCards {
  visiteurs: number;
  simulationsEligibles: number;
  simulationsTerminees: number;
  comptesCrees: number;
  dossiersEligibiliteDeposes: number;
  diagnostics: number;
}

/** Un point de la courbe d'évolution mensuelle. */
export interface PointEvolutionMensuelle {
  /** Libellé du mois, ex: "oct. 2025". */
  label: string;
  count: number;
}

/** Séries mensuelles depuis le lancement, une par métrique du graphique. */
export interface PublicStatsEvolution {
  visiteurs: PointEvolutionMensuelle[];
  comptesCrees: PointEvolutionMensuelle[];
  dossiersDeposes: PointEvolutionMensuelle[];
  dossiersEligibiliteValides: PointEvolutionMensuelle[];
}
