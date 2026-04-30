"use server";

import { getSession } from "@/features/auth/server";
import type { ActionResult } from "@/shared/types/action-result.types";
import {
  assignAmoAutomatiqueForUser,
  skipAmoStepForUser,
  type SelectAmoResult,
} from "../services/amo-selection.service";

/**
 * Auto-attribue un AMO au parcours du demandeur connecté
 * (modes OBLIGATOIRE et AV_AMO_FUSIONNES — départements arrêté 2026).
 */
export async function assignAmoAutomatique(): Promise<ActionResult<SelectAmoResult>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }
    return await assignAmoAutomatiqueForUser(session.userId);
  } catch (error) {
    console.error("Erreur assignAmoAutomatique:", error);
    return { success: false, error: "Erreur lors de l'auto-attribution de l'AMO" };
  }
}

/**
 * Renonce à un AMO et avance le parcours à l'étape ELIGIBILITE
 * (mode FACULTATIF uniquement).
 */
export async function skipAmoStep(): Promise<ActionResult<{ message: string }>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }
    return await skipAmoStepForUser(session.userId);
  } catch (error) {
    console.error("Erreur skipAmoStep:", error);
    return { success: false, error: "Erreur lors du saut de l'étape AMO" };
  }
}
