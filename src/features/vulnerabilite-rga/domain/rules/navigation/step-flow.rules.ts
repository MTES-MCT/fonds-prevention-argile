import { VulnerabiliteStep } from "../../value-objects/vulnerabilite-step.enum";

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
  VulnerabiliteStep.RECUPERATEUR_EAU,
  VulnerabiliteStep.ARBRE_PROXIMITE,
  VulnerabiliteStep.HAIES,
  VulnerabiliteStep.VEGETATION_PIED_FACADE,
  VulnerabiliteStep.MITOYENNETE,
  VulnerabiliteStep.ENSOLEILLEMENT,
  VulnerabiliteStep.SOURCE_CHALEUR_SOUS_SOL,
  VulnerabiliteStep.RESULTAT,
];

export function getNextStep(currentStep: VulnerabiliteStep): VulnerabiliteStep | null {
  const index = STEP_ORDER.indexOf(currentStep);
  if (index === -1 || index + 1 >= STEP_ORDER.length) return null;
  return STEP_ORDER[index + 1];
}

export function getPreviousStep(currentStep: VulnerabiliteStep): VulnerabiliteStep | null {
  const index = STEP_ORDER.indexOf(currentStep);
  if (index <= 0) return null;
  return STEP_ORDER[index - 1];
}

export function canGoToStep(targetStep: VulnerabiliteStep, currentStep: VulnerabiliteStep): boolean {
  const targetIndex = STEP_ORDER.indexOf(targetStep);
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  return targetIndex <= currentIndex;
}
