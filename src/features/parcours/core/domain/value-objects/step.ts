// Réexporter depuis le Shared Kernel
export { Step, STEP_LABELS, STEP_LABELS_NUMBERED } from "@/shared/domain/value-objects/step.enum";

// Importer pour utiliser dans les fonctions
import { Step } from "@/shared/domain/value-objects/step.enum";

/**
 * Ordre des étapes dans le parcours
 */
export const STEP_ORDER = [Step.CHOIX_AMO, Step.ELIGIBILITE, Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES] as const;

/**
 * Type dérivé pour l'ordre des étapes
 */
export type StepOrder = typeof STEP_ORDER;

/**
 * Vérifie si stepA est avant stepB dans le parcours
 */
export function isStepBefore(stepA: Step, stepB: Step): boolean {
  return STEP_ORDER.indexOf(stepA) < STEP_ORDER.indexOf(stepB);
}

/**
 * Vérifie si stepA est après stepB dans le parcours
 */
export function isStepAfter(stepA: Step, stepB: Step): boolean {
  return STEP_ORDER.indexOf(stepA) > STEP_ORDER.indexOf(stepB);
}

/**
 * Obtient l'étape suivante dans le parcours
 */
export function getNextStep(currentStep: Step): Step | null {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  const nextIndex = currentIndex + 1;

  return nextIndex < STEP_ORDER.length ? STEP_ORDER[nextIndex] : null;
}

/**
 * Obtient l'étape précédente dans le parcours
 */
export function getPreviousStep(currentStep: Step): Step | null {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  const previousIndex = currentIndex - 1;

  return previousIndex >= 0 ? STEP_ORDER[previousIndex] : null;
}

/**
 * Vérifie si une étape est la dernière
 */
export function isLastStep(step: Step): boolean {
  return step === STEP_ORDER[STEP_ORDER.length - 1];
}

/**
 * Vérifie si une étape est la première
 */
export function isFirstStep(step: Step): boolean {
  return step === STEP_ORDER[0];
}
