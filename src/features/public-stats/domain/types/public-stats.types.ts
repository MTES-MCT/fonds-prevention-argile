/**
 * Chiffres cumulés depuis le lancement du service, affichés en cartes en tête de page.
 * Les compteurs Matomo (`visiteurs`, `simulationsEligibles`, `simulationsTerminees`) sont
 * `null` en cas de panne Matomo — jamais 0, pour ne pas afficher un faux zéro à la place d'une
 * vraie valeur indisponible (page en ISR : un 0 figé resterait affiché jusqu'à la prochaine
 * régénération).
 */
export interface PublicStatsCards {
  visiteurs: number | null;
  simulationsEligibles: number | null;
  simulationsTerminees: number | null;
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

/**
 * Séries mensuelles depuis le lancement, une par métrique du graphique. `visiteurs` (Matomo) est
 * `null` en cas de panne — jamais une série à 0 sur tous les mois, qui serait indiscernable d'une
 * vraie absence de visites (même raison que `PublicStatsCards`).
 */
export interface PublicStatsEvolution {
  visiteurs: PointEvolutionMensuelle[] | null;
  comptesCrees: PointEvolutionMensuelle[];
  /** Même définition que la carte `dossiersEligibiliteDeposes` : cumul et série doivent concorder. */
  dossiersEligibiliteDeposes: PointEvolutionMensuelle[];
  dossiersEligibiliteValides: PointEvolutionMensuelle[];
}
