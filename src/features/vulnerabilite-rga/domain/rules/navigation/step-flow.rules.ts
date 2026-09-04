import { VulnerabiliteStep } from "../../value-objects/vulnerabilite-step.enum";
import type { PartialVulnerabiliteReponses } from "../../types/vulnerabilite-reponses.types";

/**
 * Ordre complet des étapes (intro + résultat inclus).
 */
const STEP_ORDER: VulnerabiliteStep[] = [
  VulnerabiliteStep.INTRO,
  VulnerabiliteStep.ADRESSE,
  VulnerabiliteStep.PENTE_TERRAIN,
  VulnerabiliteStep.RESEAUX_ENTERRES,
  VulnerabiliteStep.GRAVIER_PROPRETE,
  VulnerabiliteStep.GOUTTIERES,
  VulnerabiliteStep.ARBRE_PROXIMITE,
  VulnerabiliteStep.ARBRE_ESSENCE,
  VulnerabiliteStep.HAIES,
  VulnerabiliteStep.VEGETATION_PIED_FACADE,
  VulnerabiliteStep.MITOYENNETE,
  VulnerabiliteStep.ENSOLEILLEMENT,
  VulnerabiliteStep.RESULTAT,
];

/**
 * Contrairement au simulateur d'éligibilité (qui n'a qu'un early-exit vers RESULTAT,
 * jamais de saut intra-parcours), ce simulateur a un vrai branchement conditionnel :
 * ARBRE_ESSENCE n'a de sens que si un arbre a été signalé proche des fondations.
 * `getNextStep`/`getPreviousStep` prennent donc les réponses en paramètre.
 */
function shouldSkipStep(step: VulnerabiliteStep, answers: PartialVulnerabiliteReponses): boolean {
  if (step === VulnerabiliteStep.ARBRE_ESSENCE) {
    return answers.vegetation?.arbre_proximite !== "oui";
  }
  return false;
}

export function getNextStep(
  currentStep: VulnerabiliteStep,
  answers: PartialVulnerabiliteReponses
): VulnerabiliteStep | null {
  let index = STEP_ORDER.indexOf(currentStep);
  if (index === -1) return null;

  do {
    index++;
    if (index >= STEP_ORDER.length) return null;
  } while (shouldSkipStep(STEP_ORDER[index], answers));

  return STEP_ORDER[index];
}

export function getPreviousStep(
  currentStep: VulnerabiliteStep,
  answers: PartialVulnerabiliteReponses
): VulnerabiliteStep | null {
  let index = STEP_ORDER.indexOf(currentStep);
  if (index === -1) return null;

  do {
    index--;
    if (index < 0) return null;
  } while (shouldSkipStep(STEP_ORDER[index], answers));

  return STEP_ORDER[index];
}

export function canGoToStep(targetStep: VulnerabiliteStep, currentStep: VulnerabiliteStep): boolean {
  const targetIndex = STEP_ORDER.indexOf(targetStep);
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  return targetIndex <= currentIndex;
}
