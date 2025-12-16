import type { PartialRGASimulationData } from "@/shared/domain/types";
import type { SimulationState } from "../entities/simulation-state.entity";
import { createInitialSimulationState } from "../entities/simulation-state.entity";
import { SimulateurStep } from "../value-objects/simulateur-step.enum";
import { getNextStep, getPreviousStep } from "../rules/navigation";
import { EligibilityService } from "./eligibility.service";

/**
 * Service de simulation - gère les transitions d'état
 */
export const SimulationService = {
  /**
   * Crée une nouvelle simulation
   */
  create(): SimulationState {
    return createInitialSimulationState();
  },

  /**
   * Démarre la simulation (passe de l'intro à la première étape)
   */
  start(state: SimulationState): SimulationState {
    if (state.currentStep !== SimulateurStep.INTRO) {
      return state;
    }

    const nextStep = getNextStep(SimulateurStep.INTRO);
    if (!nextStep) return state;

    return {
      ...state,
      currentStep: nextStep,
      history: [...state.history, SimulateurStep.INTRO],
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * Soumet une réponse et passe à l'étape suivante (ou early exit)
   */
  submitAnswer(state: SimulationState, answerUpdates: PartialRGASimulationData): SimulationState {
    // Fusionner les réponses
    const newAnswers = mergeAnswers(state.answers, answerUpdates);

    // Évaluer l'éligibilité
    const { result } = EligibilityService.evaluate(newAnswers);

    // Early exit ou simulation terminée
    if (result) {
      return {
        ...state,
        answers: newAnswers,
        currentStep: SimulateurStep.RESULTAT,
        history: [...state.history, state.currentStep],
        result,
        updatedAt: new Date().toISOString(),
      };
    }

    // Passer à l'étape suivante
    const nextStep = getNextStep(state.currentStep);
    if (!nextStep) {
      return {
        ...state,
        answers: newAnswers,
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      ...state,
      answers: newAnswers,
      currentStep: nextStep,
      history: [...state.history, state.currentStep],
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * Revient à l'étape précédente
   */
  goBack(state: SimulationState): SimulationState {
    if (state.history.length === 0) {
      return state;
    }

    const previousStep = state.history[state.history.length - 1];
    const newHistory = state.history.slice(0, -1);

    return {
      ...state,
      currentStep: previousStep,
      history: newHistory,
      result: null, // Effacer le résultat si on revient en arrière
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * Réinitialise la simulation
   */
  reset(): SimulationState {
    return createInitialSimulationState();
  },

  /**
   * Vérifie si on peut revenir en arrière
   */
  canGoBack(state: SimulationState): boolean {
    return state.history.length > 0 && state.currentStep !== SimulateurStep.INTRO;
  },

  /**
   * Vérifie si la simulation est terminée (résultat disponible)
   */
  isFinished(state: SimulationState): boolean {
    return state.result !== null;
  },

  /**
   * Vérifie si le résultat est éligible
   */
  isEligible(state: SimulationState): boolean {
    return state.result?.eligible === true;
  },
};

/**
 * Fusionne les réponses de manière profonde
 */
function mergeAnswers(current: PartialRGASimulationData, updates: PartialRGASimulationData): PartialRGASimulationData {
  return {
    logement: {
      ...current.logement,
      ...updates.logement,
    },
    taxeFonciere: {
      ...current.taxeFonciere,
      ...updates.taxeFonciere,
    },
    rga: {
      ...current.rga,
      ...updates.rga,
    },
    menage: {
      ...current.menage,
      ...updates.menage,
    },
    vous: {
      ...current.vous,
      ...updates.vous,
    },
  };
}
