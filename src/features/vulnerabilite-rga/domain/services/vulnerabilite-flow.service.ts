import { VulnerabiliteStep } from "../value-objects/vulnerabilite-step.enum";
import { getNextStep } from "../rules/navigation/step-flow.rules";
import { createInitialVulnerabiliteState, type VulnerabiliteState } from "../entities/vulnerabilite-state.entity";
import { computeScoreResult } from "./scoring.service";
import type { PartialVulnerabiliteReponses } from "../types/vulnerabilite-reponses.types";

/**
 * Fusionne les réponses de manière profonde, section par section. L'adresse est
 * remplacée en bloc (soumise en une fois par l'étape adresse, jamais partiellement) ;
 * les autres sections sont fusionnées champ par champ (une question = un champ).
 */
function mergeAnswers(
  current: PartialVulnerabiliteReponses,
  updates: PartialVulnerabiliteReponses
): PartialVulnerabiliteReponses {
  return {
    adresse: updates.adresse ?? current.adresse,
    eaux: { ...current.eaux, ...updates.eaux },
    vegetation: { ...current.vegetation, ...updates.vegetation },
    divers: { ...current.divers, ...updates.divers },
  };
}

/** Section + clé(s) à effacer quand on quitte une étape par le bouton retour. */
const STEP_SPECIFIC_KEYS: Partial<
  Record<VulnerabiliteStep, { section: "adresse" | "eaux" | "vegetation" | "divers"; keys?: string[] }>
> = {
  [VulnerabiliteStep.ADRESSE]: { section: "adresse" },
  [VulnerabiliteStep.PENTE_TERRAIN]: { section: "eaux", keys: ["pente_terrain"] },
  [VulnerabiliteStep.RESEAUX_ENTERRES]: { section: "eaux", keys: ["reseaux_enterres"] },
  [VulnerabiliteStep.GRAVIER_PROPRETE]: { section: "eaux", keys: ["gravier_proprete"] },
  [VulnerabiliteStep.GOUTTIERES]: { section: "eaux", keys: ["gouttieres"] },
  [VulnerabiliteStep.ARBRE_PROXIMITE]: { section: "vegetation", keys: ["arbre_proximite"] },
  [VulnerabiliteStep.ARBRE_ESSENCE]: { section: "vegetation", keys: ["arbre_essence"] },
  [VulnerabiliteStep.HAIES]: { section: "vegetation", keys: ["haies"] },
  [VulnerabiliteStep.VEGETATION_PIED_FACADE]: { section: "vegetation", keys: ["vegetation_pied_facade"] },
  [VulnerabiliteStep.MITOYENNETE]: { section: "divers", keys: ["mitoyennete"] },
  [VulnerabiliteStep.ENSOLEILLEMENT]: { section: "divers", keys: ["ensoleillement"] },
};

function clearAnswersForStep(
  step: VulnerabiliteStep,
  answers: PartialVulnerabiliteReponses
): PartialVulnerabiliteReponses {
  const spec = STEP_SPECIFIC_KEYS[step];
  if (!spec) return answers;

  if (!spec.keys) {
    return { ...answers, [spec.section]: undefined };
  }

  const sectionData = answers[spec.section];
  if (!sectionData) return answers;

  const cleaned = { ...sectionData } as Record<string, unknown>;
  for (const key of spec.keys) delete cleaned[key];

  return { ...answers, [spec.section]: cleaned };
}

/**
 * Service de transition d'état du parcours de vulnérabilité — même esprit que
 * `SimulationService` du simulateur d'éligibilité, mais sans early-exit : ici on
 * avance toujours étape par étape, jusqu'au calcul du score à la dernière étape.
 */
export const VulnerabiliteFlowService = {
  create(): VulnerabiliteState {
    return createInitialVulnerabiliteState();
  },

  start(state: VulnerabiliteState): VulnerabiliteState {
    if (state.currentStep !== VulnerabiliteStep.INTRO) return state;

    const nextStep = getNextStep(VulnerabiliteStep.INTRO, state.answers);
    if (!nextStep) return state;

    return {
      ...state,
      currentStep: nextStep,
      history: [...state.history, VulnerabiliteStep.INTRO],
      updatedAt: new Date().toISOString(),
    };
  },

  submitAnswer(state: VulnerabiliteState, answerUpdates: PartialVulnerabiliteReponses): VulnerabiliteState {
    const newAnswers = mergeAnswers(state.answers, answerUpdates);
    const nextStep = getNextStep(state.currentStep, newAnswers);

    if (!nextStep) {
      return { ...state, answers: newAnswers, updatedAt: new Date().toISOString() };
    }

    if (nextStep === VulnerabiliteStep.RESULTAT) {
      return {
        ...state,
        answers: newAnswers,
        currentStep: VulnerabiliteStep.RESULTAT,
        history: [...state.history, state.currentStep],
        result: computeScoreResult(newAnswers),
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

  goBack(state: VulnerabiliteState): VulnerabiliteState {
    if (state.history.length === 0) return state;

    const previousStep = state.history[state.history.length - 1];
    const newHistory = state.history.slice(0, -1);
    const answers = clearAnswersForStep(state.currentStep, state.answers);

    return {
      ...state,
      currentStep: previousStep,
      history: newHistory,
      answers,
      result: null,
      updatedAt: new Date().toISOString(),
    };
  },

  reset(): VulnerabiliteState {
    return createInitialVulnerabiliteState();
  },

  canGoBack(state: VulnerabiliteState): boolean {
    return state.history.length > 0 && state.currentStep !== VulnerabiliteStep.INTRO;
  },

  isFinished(state: VulnerabiliteState): boolean {
    return state.result !== null;
  },
};
