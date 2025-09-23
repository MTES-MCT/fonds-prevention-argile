import {
  Step,
  Status,
  ParcoursState,
  STEP_ORDER,
  DSStatus,
} from "./parcours.types";

/**
 * Vérifie si on peut créer un dossier (TODO -> EN_INSTRUCTION)
 */
export function canCreateDossier(state: ParcoursState): boolean {
  return state.status === Status.TODO;
}

/**
 * Vérifie si on peut valider un dossier (EN_INSTRUCTION -> VALIDE)
 */
export function canValidateDossier(state: ParcoursState): boolean {
  return state.status === Status.EN_INSTRUCTION;
}

/**
 * Vérifie si on peut passer à l'étape suivante
 */
export function canPassToNextStep(state: ParcoursState): boolean {
  return state.status === Status.VALIDE && !isLastStep(state.step);
}

/**
 * Obtient l'étape suivante
 */
export function getNextStep(currentStep: Step): Step | null {
  const index = STEP_ORDER.indexOf(currentStep);
  if (index === -1 || index === STEP_ORDER.length - 1) {
    return null;
  }
  return STEP_ORDER[index + 1];
}

/**
 * Vérifie si c'est la dernière étape
 */
export function isLastStep(step: Step): boolean {
  return step === Step.FACTURES;
}

/**
 * Vérifie si le parcours est terminé
 */
export function isParcoursComplete(state: ParcoursState): boolean {
  return state.step === Step.FACTURES && state.status === Status.VALIDE;
}

/**
 * Obtient l'action recommandée pour l'utilisateur
 */
export function getNextAction(state: ParcoursState): string {
  if (isParcoursComplete(state)) {
    return "Parcours terminé !";
  }

  switch (state.status) {
    case Status.TODO:
      return `Créer votre dossier pour l'étape ${state.step}`;
    case Status.EN_INSTRUCTION:
      return "En attente de validation";
    case Status.VALIDE:
      return "Passer à l'étape suivante";
    default:
      return "Action inconnue";
  }
}

/**
 * Convertit un statut DS vers notre statut interne
 */
export function mapDSStatusToInternalStatus(dsStatus: DSStatus): Status {
  switch (dsStatus) {
    case DSStatus.EN_CONSTRUCTION:
      return Status.TODO;
    case DSStatus.EN_INSTRUCTION:
      return Status.EN_INSTRUCTION;
    case DSStatus.ACCEPTE:
      return Status.VALIDE;
    case DSStatus.REFUSE:
    case DSStatus.CLASSE_SANS_SUITE:
      return Status.TODO;
    default:
      return Status.TODO;
  }
}
