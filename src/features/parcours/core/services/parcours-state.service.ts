import {
  getOrCreateParcours,
  getParcoursComplet,
} from "@/shared/database/services";
import type { ParcoursState, Parcours } from "../domain/entities/parcours";
import type { Step } from "../domain/value-objects/step";
import { getNextStep } from "../domain/value-objects/step";
import {
  getParcoursPermissions,
  isParcoursComplete,
} from "./parcours-permissions.service";

/**
 * Service de gestion de l'état du parcours
 */

/**
 * Initialise ou récupère le parcours d'un utilisateur
 */
export async function initOrGetParcours(userId: string): Promise<{
  parcoursId: string;
  state: ParcoursState;
}> {
  const parcours = await getOrCreateParcours(userId);

  return {
    parcoursId: parcours.id,
    state: {
      step: parcours.currentStep,
      status: parcours.currentStatus,
    },
  };
}

/**
 * Récupère l'état du parcours avec permissions
 */
export async function getParcoursStateWithPermissions(userId: string): Promise<{
  state: ParcoursState;
  nextAction: string;
  complete: boolean;
  canCreateDossier: boolean;
  canValidateDossier: boolean;
  canPassToNextStep: boolean;
}> {
  const data = await getParcoursComplet(userId);

  if (!data) {
    throw new Error("Parcours non trouvé");
  }

  const state: ParcoursState = {
    step: data.parcours.currentStep,
    status: data.parcours.currentStatus,
  };

  const permissions = getParcoursPermissions(state);

  return {
    state,
    nextAction: permissions.nextAction,
    complete: permissions.isComplete,
    canCreateDossier: permissions.canCreateDossier,
    canValidateDossier: permissions.canValidateDossier,
    canPassToNextStep: permissions.canPassToNextStep,
  };
}

/**
 * Récupère le parcours complet avec dossiers
 */
export async function getFullParcours(userId: string): Promise<{
  parcours: Parcours;
  dossiers: any[]; // Type à affiner avec DossierDS de dossiers-ds/
  isComplete: boolean;
  prochainEtape: Step | null;
}> {
  const data = await getParcoursComplet(userId);

  if (!data) {
    throw new Error("Parcours non trouvé");
  }

  const state: ParcoursState = {
    step: data.parcours.currentStep,
    status: data.parcours.currentStatus,
  };

  return {
    parcours: data.parcours as Parcours,
    dossiers: data.dossiers || [],
    isComplete: isParcoursComplete(state),
    prochainEtape: getNextStep(state.step),
  };
}
