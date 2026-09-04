"use client";

import {
  useVulnerabiliteStore,
  selectCurrentStep,
  selectAnswers,
  selectResult,
  selectIsHydrated,
  selectCanGoBack,
} from "../stores/vulnerabilite.store";
import type { PartialVulnerabiliteReponses } from "../domain/types/vulnerabilite-reponses.types";
import { VulnerabiliteStep, getNumeroEtape, getTotalEtapes } from "../domain/value-objects/vulnerabilite-step.enum";

/**
 * Hook principal pour le formulaire du simulateur de vulnérabilité.
 */
export function useVulnerabiliteFormulaire() {
  const currentStep = useVulnerabiliteStore(selectCurrentStep);
  const answers = useVulnerabiliteStore(selectAnswers);
  const result = useVulnerabiliteStore(selectResult);
  const isHydrated = useVulnerabiliteStore(selectIsHydrated);
  const canGoBack = useVulnerabiliteStore(selectCanGoBack);

  const start = useVulnerabiliteStore((state) => state.start);
  const submitAnswer = useVulnerabiliteStore((state) => state.submitAnswer);
  const goBack = useVulnerabiliteStore((state) => state.goBack);
  const reset = useVulnerabiliteStore((state) => state.reset);

  const numeroEtape = getNumeroEtape(currentStep, answers);
  const totalEtapes = getTotalEtapes(answers);

  if (!isHydrated) {
    return {
      isLoading: true,
      currentStep: VulnerabiliteStep.INTRO,
      answers: {} as PartialVulnerabiliteReponses,
      result: null,
      numeroEtape: null,
      totalEtapes: 0,
      canGoBack: false,
      start: () => {},
      submitAnswer: (() => {}) as (answers: PartialVulnerabiliteReponses) => void,
      goBack: () => {},
      reset: () => {},
    };
  }

  return {
    isLoading: false,
    currentStep,
    answers,
    result,
    numeroEtape,
    totalEtapes,
    canGoBack,
    start,
    submitAnswer,
    goBack,
    reset,
  };
}
