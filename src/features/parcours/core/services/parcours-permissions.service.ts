import type { ParcoursState } from "../domain/entities/parcours";
import { Status } from "../domain/value-objects/status";
import { Step, isLastStep } from "../domain/value-objects/step";

/**
 * Service de gestion des permissions du parcours
 */

/**
 * Vérifie si on peut créer un dossier (TODO → EN_INSTRUCTION)
 */
export function canCreateDossier(state: ParcoursState): boolean {
  return state.status === Status.TODO;
}

/**
 * Vérifie si on peut valider un dossier (EN_INSTRUCTION → VALIDE)
 */
export function canValidateDossier(state: ParcoursState): boolean {
  return state.status === Status.EN_INSTRUCTION;
}

/**
 * Vérifie si on peut passer à l'étape suivante (VALIDE → étape suivante)
 */
export function canPassToNextStep(state: ParcoursState): boolean {
  return state.status === Status.VALIDE && !isLastStep(state.step);
}

/**
 * Vérifie si le parcours est terminé
 */
export function isParcoursComplete(state: ParcoursState): boolean {
  return state.step === Step.FACTURES && state.status === Status.VALIDE;
}

/**
 * Obtient l'action recommandée pour l'utilisateur (pour l'UI)
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
 * Récupère toutes les permissions pour un état donné
 * Utile pour envoyer au client en une fois
 */
export function getParcoursPermissions(state: ParcoursState) {
  return {
    canCreateDossier: canCreateDossier(state),
    canValidateDossier: canValidateDossier(state),
    canPassToNextStep: canPassToNextStep(state),
    isComplete: isParcoursComplete(state),
    nextAction: getNextAction(state),
  };
}
