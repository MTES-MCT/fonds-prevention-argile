import type { Parcours } from "../entities/parcours";
import type { DossierDS } from "../../../dossiers-ds/domain/entities/dossier-ds";
import type { Step } from "../value-objects/step";

/**
 * Résultat complet du parcours d'un utilisateur
 */
export interface ParcoursComplet {
  parcours: Parcours;
  dossiers: DossierDS[];
  isComplete: boolean;
  prochainEtape: Step | null;
}

/**
 * Résumé du parcours (pour affichage)
 */
export interface ParcoursSummary {
  currentStep: Step;
  completedSteps: Step[];
  totalSteps: number;
  progressPercentage: number;
}
