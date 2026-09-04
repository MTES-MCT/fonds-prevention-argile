import { VulnerabiliteStep } from "../value-objects/vulnerabilite-step.enum";
import type { PartialVulnerabiliteReponses } from "../types/vulnerabilite-reponses.types";
import type { VulnerabiliteScoreResult } from "../services/scoring.service";

/**
 * État complet du parcours de vulnérabilité en cours.
 */
export interface VulnerabiliteState {
  currentStep: VulnerabiliteStep;
  answers: PartialVulnerabiliteReponses;
  /** Historique de navigation (pour le bouton retour). */
  history: VulnerabiliteStep[];
  /** Résultat calculé une fois arrivé à l'étape RESULTAT. */
  result: VulnerabiliteScoreResult | null;
  startedAt: string;
  updatedAt: string;
}

export function createInitialVulnerabiliteState(): VulnerabiliteState {
  const now = new Date().toISOString();
  return {
    currentStep: VulnerabiliteStep.INTRO,
    answers: {},
    history: [],
    result: null,
    startedAt: now,
    updatedAt: now,
  };
}
