"use server";

import { getSession } from "@/features/auth/server";
import type { ActionResult } from "@/shared/types";
import type { ParcoursState } from "../domain/entities/parcours";
import {
  validateCurrentStep,
  moveToNextStep,
} from "../services/parcours-progression.service";

/**
 * Valide le dossier de l'étape courante
 * (passe de EN_INSTRUCTION à VALIDE)
 *
 * Généralement appelé par webhook ou synchronisation périodique
 */
export async function validerDossier(): Promise<
  ActionResult<{ state: ParcoursState }>
> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const result = await validateCurrentStep(session.userId);

    return result;
  } catch (error) {
    console.error("Erreur validerDossier:", error);
    return {
      success: false,
      error: "Erreur lors de la validation",
    };
  }
}

/**
 * Passe à l'étape suivante
 * (VALIDE → étape suivante en TODO)
 */
export async function passerEtapeSuivante(): Promise<
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

    const result = await moveToNextStep(session.userId);

    return result;
  } catch (error) {
    console.error("Erreur passerEtapeSuivante:", error);
    return {
      success: false,
      error: "Erreur lors de la progression",
    };
  }
}
