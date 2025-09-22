import { Step, Status, DSStatus } from "./parcours.types";
import { STEP_ORDER, DS_TO_INTERNAL_STATUS } from "./parcours.constants";

/**
 * Récupère l'étape suivante dans le parcours
 */
export function getNextStep(currentStep: Step): Step | null {
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  if (currentIndex === -1 || currentIndex === STEP_ORDER.length - 1) {
    return null;
  }

  return STEP_ORDER[currentIndex + 1];
}

/**
 * Vérifie si le parcours est terminé
 */
export function isParcoursComplete(currentStep: Step): boolean {
  return currentStep === STEP_ORDER[STEP_ORDER.length - 1];
}

/**
 * Convertit un statut Démarches Simplifiées vers un statut interne
 */
export function mapDSStatusToInternalStatus(dsStatus: DSStatus): Status {
  return DS_TO_INTERNAL_STATUS[dsStatus];
}
