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
import { EligibilityService } from "../domain/services/eligibility.service";

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

  // Fallback : si on est au résultat mais que les checks sont manquants (ex: corruption sessionStorage),
  // on re-évalue l'éligibilité à partir des réponses existantes
  let checks = result?.checks ?? null;
  if (currentStep === SimulateurStep.RESULTAT && !checks) {
    if (Object.keys(answers).length > 0) {
      console.warn(
        "[Simulateur] Checks manquants à l'étape RESULTAT, re-évaluation...",
        { result, answersKeys: Object.keys(answers) },
      );
      const reEval = EligibilityService.evaluate(answers);
      // Vérifier que la re-évaluation a produit un vrai résultat (au moins un check non-null)
      const hasAnyCheck = Object.values(reEval.checks).some((v) => v !== null);
      if (hasAnyCheck) {
        checks = reEval.checks;
      } else {
        console.error("[Simulateur] Re-évaluation sans résultat, données insuffisantes — reset");
        reset();
      }
    } else {
      console.error("[Simulateur] Étape RESULTAT sans answers — reset");
      reset();
    }
  }

  return {
    isLoading: false,
    currentStep,
    answers,
    result,
    checks,
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
