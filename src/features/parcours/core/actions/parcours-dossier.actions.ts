"use server";

import { getSession } from "@/features/auth/server";
import {
  getParcoursComplet,
  createDossierDS,
} from "@/shared/database/services";
import { parcoursRepo } from "@/shared/database/repositories";
import type { ActionResult } from "@/shared/types";
import type { ParcoursState } from "../domain/entities/parcours";
import { Status } from "../domain/value-objects/status";
import { canCreateDossier } from "../services/parcours-permissions.service";

/**
 * Crée un dossier Démarches Simplifiées pour l'étape courante
 * et passe le parcours en EN_INSTRUCTION
 */
export async function creerDossier(
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

    // Vérifier permissions
    if (!canCreateDossier(currentState)) {
      return {
        success: false,
        error: "Ce dossier ne peut pas être créé (statut invalide)",
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
    console.error("Erreur creerDossier:", error);
    return {
      success: false,
      error: "Erreur lors de la création du dossier",
    };
  }
}
