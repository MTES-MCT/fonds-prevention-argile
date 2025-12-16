import type { SimulateurStep } from "../value-objects/simulateur-step.enum";
import type { EligibilityResult } from "./eligibility-result.entity";
import type { PartialRGASimulationData } from "@/shared/domain/types";

/**
 * État complet de la simulation en cours
 */
export interface SimulationState {
  /** Étape courante */
  currentStep: SimulateurStep;

  /** Réponses collectées (format DB directement) */
  answers: PartialRGASimulationData;

  /** Historique de navigation (pour le bouton retour) */
  history: SimulateurStep[];

  /** Résultat si la simulation est terminée ou early exit */
  result: EligibilityResult | null;

  /** Timestamp de début */
  startedAt: string;

  /** Timestamp de dernière mise à jour */
  updatedAt: string;
}

/**
 * Crée un état initial de simulation
 */
export function createInitialSimulationState(): SimulationState {
  const now = new Date().toISOString();
  return {
    currentStep: "intro",
    answers: {},
    history: [],
    result: null,
    startedAt: now,
    updatedAt: now,
  };
}

/**
 * Vérifie si la simulation a un résultat (terminée)
 */
export function hasSimulationResult(state: SimulationState): boolean {
  return state.result !== null;
}
/**
 * Vérifie si la simulation a abouti à une éligibilité
 */
export function isSimulationEligible(state: SimulationState): boolean {
  return state.result?.eligible === true;
}
