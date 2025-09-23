"use server";

import { Step, Status, ParcoursState } from "@/lib/parcours/parcours.types";
import {
  canSubmit,
  canValidate,
  canProgress,
  getNextStep,
  isParcoursComplete,
  getNextAction,
} from "@/lib/parcours/parcours.helpers";
import {
  getOrCreateParcours,
  getParcoursComplet,
  createDossierDS,
} from "@/lib/database/services";
import { getSession } from "@/lib/auth/services/auth.service";
import { parcoursRepo } from "@/lib/database/repositories";
import type { ActionResult } from "./demarches-simplifies/types";
import {
  DossierDemarchesSimplifiees,
  ParcoursPrevention,
} from "../database/schema";

/**
 * Initialise ou récupère le parcours
 */
export async function initierParcours(): Promise<
  ActionResult<{
    parcoursId: string;
    state: ParcoursState;
  }>
> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return {
        success: false,
        error: "Non connecté",
      };
    }

    const parcours = await getOrCreateParcours(session.userId);

    return {
      success: true,
      data: {
        parcoursId: parcours.id,
        state: {
          step: parcours.currentStep,
          status: parcours.currentStatus,
        },
      },
    };
  } catch (error) {
    console.error("Erreur initierParcours:", error);
    return {
      success: false,
      error: "Erreur lors de l'initialisation",
    };
  }
}

/**
 * Soumet un dossier (passe de TODO à EN_INSTRUCTION)
 */
export async function soumettreEtape(
  dsNumber: string,
  dsDemarcheId: string,
  dsUrl?: string
): Promise<ActionResult<{ state: ParcoursState }>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const data = await getParcoursComplet(session.userId);
    if (!data) {
      return { success: false, error: "Parcours non trouvé" };
    }

    const currentState: ParcoursState = {
      step: data.parcours.currentStep,
      status: data.parcours.currentStatus,
    };

    // Vérifier qu'on peut soumettre
    if (!canSubmit(currentState)) {
      return {
        success: false,
        error: "Cette étape ne peut pas être soumise",
      };
    }

    // Créer le dossier DS
    await createDossierDS(session.userId, currentState.step, {
      dsNumber,
      dsDemarcheId,
      dsUrl,
    });

    // Passer en instruction
    await parcoursRepo.updateStatus(data.parcours.id, Status.EN_INSTRUCTION);

    return {
      success: true,
      data: {
        state: {
          step: currentState.step,
          status: Status.EN_INSTRUCTION,
        },
      },
    };
  } catch (error) {
    console.error("Erreur soumettreEtape:", error);
    return {
      success: false,
      error: "Erreur lors de la soumission",
    };
  }
}

/**
 * Valide l'étape (passe de EN_INSTRUCTION à VALIDE)
 * Généralement appelé par webhook ou admin
 */
export async function validerEtape(): Promise<
  ActionResult<{ state: ParcoursState }>
> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const data = await getParcoursComplet(session.userId);
    if (!data) {
      return { success: false, error: "Parcours non trouvé" };
    }

    const currentState: ParcoursState = {
      step: data.parcours.currentStep,
      status: data.parcours.currentStatus,
    };

    if (!canValidate(currentState)) {
      return {
        success: false,
        error: "Cette étape ne peut pas être validée",
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
  } catch (error) {
    console.error("Erreur validerEtape:", error);
    return {
      success: false,
      error: "Erreur lors de la validation",
    };
  }
}

/**
 * Passe à l'étape suivante (VALIDE -> étape suivante en TODO)
 */
export async function progresserEtape(): Promise<
  ActionResult<{
    state: ParcoursState;
    complete: boolean;
  }>
> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const data = await getParcoursComplet(session.userId);
    if (!data) {
      return { success: false, error: "Parcours non trouvé" };
    }

    const currentState: ParcoursState = {
      step: data.parcours.currentStep,
      status: data.parcours.currentStatus,
    };

    if (!canProgress(currentState)) {
      if (isParcoursComplete(currentState)) {
        return {
          success: true,
          data: {
            state: currentState,
            complete: true,
          },
        };
      }
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
  } catch (error) {
    console.error("Erreur progresserEtape:", error);
    return {
      success: false,
      error: "Erreur lors de la progression",
    };
  }
}

/**
 * Récupère l'état actuel du parcours avec infos utiles
 */
export async function getParcoursStatus(): Promise<
  ActionResult<{
    state: ParcoursState;
    nextAction: string;
    complete: boolean;
    canSubmit: boolean;
    canValidate: boolean;
    canProgress: boolean;
  }>
> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const data = await getParcoursComplet(session.userId);
    if (!data) {
      return { success: false, error: "Parcours non trouvé" };
    }

    const state: ParcoursState = {
      step: data.parcours.currentStep,
      status: data.parcours.currentStatus,
    };

    return {
      success: true,
      data: {
        state,
        nextAction: getNextAction(state),
        complete: isParcoursComplete(state),
        canSubmit: canSubmit(state),
        canValidate: canValidate(state),
        canProgress: canProgress(state),
      },
    };
  } catch (error) {
    console.error("Erreur getParcoursStatus:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération du statut",
    };
  }
}

/**
 * Réinitialise le parcours (pour les tests/debug)
 */
export async function resetParcours(): Promise<
  ActionResult<{ message: string }>
> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const data = await getParcoursComplet(session.userId);
    if (!data) {
      return { success: false, error: "Parcours non trouvé" };
    }

    await parcoursRepo.updateStep(
      data.parcours.id,
      Step.ELIGIBILITE,
      Status.TODO
    );

    return {
      success: true,
      data: { message: "Parcours réinitialisé" },
    };
  } catch (error) {
    console.error("Erreur resetParcours:", error);
    return {
      success: false,
      error: "Erreur lors de la réinitialisation",
    };
  }
}

/**
 * Récupère le parcours complet avec dossiers
 */
export async function obtenirMonParcours(): Promise<
  ActionResult<{
    parcours: ParcoursPrevention;
    dossiers: DossierDemarchesSimplifiees[];
    isComplete: boolean;
    prochainEtape: Step | null;
  }>
> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const data = await getParcoursComplet(session.userId);
    if (!data) {
      return { success: false, error: "Parcours non trouvé" };
    }

    const state: ParcoursState = {
      step: data.parcours.currentStep,
      status: data.parcours.currentStatus,
    };

    return {
      success: true,
      data: {
        parcours: data.parcours,
        dossiers: data.dossiers || [],
        isComplete: isParcoursComplete(state),
        prochainEtape: canProgress(state) ? getNextStep(state.step) : null,
      },
    };
  } catch (error) {
    console.error("Erreur obtenirMonParcours:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération",
    };
  }
}

/**
 * Réinitialise le parcours (alias pour resetParcours)
 */
export async function reinitialiserParcours(): Promise<
  ActionResult<{ message: string }>
> {
  return resetParcours();
}
