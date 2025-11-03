"use server";

import { getSession } from "@/features/auth/server";
import type { ActionResult } from "@/shared/types";
import type { ParcoursState } from "../domain/entities/parcours";
import { initOrGetParcours } from "../services/parcours-state.service";

/**
 * Initialise ou récupère le parcours de l'utilisateur connecté
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

    const result = await initOrGetParcours(session.userId);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Erreur initierParcours:", error);
    return {
      success: false,
      error: "Erreur lors de l'initialisation",
    };
  }
}
