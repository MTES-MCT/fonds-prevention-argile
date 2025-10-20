import { parcoursRepo } from "@/shared/database/repositories";
import type { ActionResult } from "@/shared/types";
import type { ParcoursState } from "../domain/entities/parcours";
import { Status } from "../domain/value-objects/status";
import { getNextStep } from "../domain/value-objects/step";
import {
  canValidateDossier,
  canPassToNextStep,
  isParcoursComplete,
} from "./parcours-permissions.service";
import { getParcoursComplet } from "./parcours-state.service";

/**
 * Service de gestion de la progression du parcours
 */

/**
 * Valide le dossier de l'étape courante
 * (passe de EN_INSTRUCTION à VALIDE)
 */
export async function validateCurrentStep(
  userId: string
): Promise<ActionResult<{ state: ParcoursState }>> {
  const data = await getParcoursComplet(userId);

  if (!data) {
    return { success: false, error: "Parcours non trouvé" };
  }

  const currentState: ParcoursState = {
    step: data.parcours.currentStep,
    status: data.parcours.status,
  };

  if (!canValidateDossier(currentState)) {
    return {
      success: false,
      error: "Ce dossier ne peut pas être validé",
    };
  }

  await parcoursRepo.updateStatus(data.parcours.id, Status.VALIDE);

  return {
    success: true,
    data: {
      state: {
        step: currentState.step,
        status: Status.VALIDE,
      },
    },
  };
}

/**
 * Passe à l'étape suivante
 * (VALIDE → étape suivante en TODO)
 */
export async function moveToNextStep(userId: string): Promise<
  ActionResult<{
    state: ParcoursState;
    complete: boolean;
  }>
> {
  const data = await getParcoursComplet(userId);

  if (!data) {
    return { success: false, error: "Parcours non trouvé" };
  }

  const currentState: ParcoursState = {
    step: data.parcours.currentStep,
    status: data.parcours.status,
  };

  // Si déjà complet
  if (isParcoursComplete(currentState)) {
    return {
      success: true,
      data: {
        state: currentState,
        complete: true,
      },
    };
  }

  // Vérifier permissions
  if (!canPassToNextStep(currentState)) {
    return {
      success: false,
      error: "Impossible de progresser depuis cet état",
    };
  }

  const nextStep = getNextStep(currentState.step);

  if (!nextStep) {
    return {
      success: false,
      error: "Pas d'étape suivante",
    };
  }

  // Passer à l'étape suivante en TODO
  await parcoursRepo.updateStep(data.parcours.id, nextStep, Status.TODO);

  return {
    success: true,
    data: {
      state: {
        step: nextStep,
        status: Status.TODO,
      },
      complete: false,
    },
  };
}
