import { Step, Status, STEP_ORDER } from "../types/parcours.types";

// Helper pour obtenir l'étape suivante
export function getNextStep(currentStep: Step): Step | null {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex === STEP_ORDER.length - 1) {
    return null;
  }
  return STEP_ORDER[currentIndex + 1];
}

// Helper pour obtenir l'étape précédente
export function getPreviousStep(currentStep: Step): Step | null {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  if (currentIndex <= 0) {
    return null;
  }
  return STEP_ORDER[currentIndex - 1];
}

// Helper pour vérifier si une étape est accessible
export function isStepAccessible(
  targetStep: Step,
  currentStep: Step,
  currentStatus: Status
): boolean {
  const targetIndex = STEP_ORDER.indexOf(targetStep);
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  // Étape actuelle : toujours accessible
  if (targetStep === currentStep) {
    return true;
  }

  // Étapes précédentes : toujours accessibles (consultation)
  if (targetIndex < currentIndex) {
    return true;
  }

  // Étape suivante : accessible seulement si l'étape actuelle est validée
  if (targetIndex === currentIndex + 1) {
    return currentStatus === "VALIDE";
  }

  // Étapes plus lointaines : non accessibles
  return false;
}

// Helper pour obtenir le label français d'une étape
export function getStepLabel(step: Step): string {
  const labels: Record<Step, string> = {
    ELIGIBILITE: "Éligibilité",
    DIAGNOSTIC: "Diagnostic",
    DEVIS: "Devis",
    FACTURES: "Factures",
  };
  return labels[step];
}

// Helper pour obtenir le label français d'un statut
export function getStatusLabel(status: Status): string {
  const labels: Record<Status, string> = {
    TODO: "À faire",
    EN_INSTRUCTION: "En instruction",
    VALIDE: "Validé",
  };
  return labels[status];
}
