"use client";

import {
  useSimulateurStore,
  selectCurrentStep,
  selectAnswers,
  selectResult,
  selectIsHydrated,
  selectCanGoBack,
  selectIsFinished,
  selectIsEligible,
  selectIsIntro,
  selectIsResultat,
} from "../stores/simulateur.store";
import type { PartialRGASimulationData } from "@/shared/domain/types";
import { getNumeroEtape, TOTAL_ETAPES, SimulateurStep } from "../domain/value-objects/simulateur-step.enum";
import { ELIGIBILITY_REASON_MESSAGES } from "../domain/value-objects/eligibility-reason.enum";
import { useRGAStore } from "../stores/rga.store";

/**
 * Hook principal pour le formulaire du simulateur
 */
export function useSimulateurFormulaire() {
  // État
  const currentStep = useSimulateurStore(selectCurrentStep);
  const answers = useSimulateurStore(selectAnswers);
  const result = useSimulateurStore(selectResult);
  const isHydrated = useSimulateurStore(selectIsHydrated);
  const canGoBack = useSimulateurStore(selectCanGoBack);
  const isFinished = useSimulateurStore(selectIsFinished);
  const isEligible = useSimulateurStore(selectIsEligible);
  const isIntro = useSimulateurStore(selectIsIntro);
  const isResultat = useSimulateurStore(selectIsResultat);

  // Actions
  const start = useSimulateurStore((state) => state.start);
  const submitAnswer = useSimulateurStore((state) => state.submitAnswer);
  const goBack = useSimulateurStore((state) => state.goBack);
  const reset = useSimulateurStore((state) => state.reset);
  const saveRGA = useRGAStore((state) => state.saveRGA);

  // Progression
  const numeroEtape = getNumeroEtape(currentStep);
  const progression = numeroEtape ? Math.round((numeroEtape / TOTAL_ETAPES) * 100) : 0;

  // Message d'erreur si non éligible
  const reasonMessage = result?.reason ? ELIGIBILITY_REASON_MESSAGES[result.reason] : null;

  // Commit vers RGA store (après éligibilité)
  const commitToRGAStore = () => {
    if (isEligible && answers) {
      saveRGA({ ...answers, simulatedAt: new Date().toISOString() });
    }
  };

  // Loading state
  if (!isHydrated) {
    return {
      isLoading: true,
      currentStep: SimulateurStep.INTRO,
      answers: {} as PartialRGASimulationData,
      result: null,
      checks: null,
      reasonMessage: null,
      numeroEtape: null,
      totalEtapes: TOTAL_ETAPES,
      progression: 0,
      canGoBack: false,
      isFinished: false,
      isEligible: false,
      isIntro: true,
      isResultat: false,
      start: () => {},
      submitAnswer: () => {},
      goBack: () => {},
      reset: () => {},
      commitToRGAStore: () => {},
    };
  }

  return {
    isLoading: false,
    currentStep,
    answers,
    result,
    checks: result?.checks ?? null,
    reasonMessage,
    numeroEtape,
    totalEtapes: TOTAL_ETAPES,
    progression,
    canGoBack,
    isFinished,
    isEligible,
    isIntro,
    isResultat,
    start,
    submitAnswer,
    goBack,
    reset,
    commitToRGAStore,
  };
}
