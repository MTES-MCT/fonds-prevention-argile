"use server";

import { z } from "zod";
import { getSession } from "@/features/auth/server";
import type { ActionResult } from "@/shared/types/action-result.types";
import {
  assignAmoAutomatiqueForUser,
  skipAmoStepForUser,
  type SelectAmoResult,
} from "../services/amo-selection.service";

/**
 * Attribue au demandeur connecté l'AMO de son territoire : l'unique, ou celle qu'il a choisie
 * quand plusieurs le couvrent. Le choix est revérifié côté serveur contre la couverture.
 */
export async function assignAmoAutomatique(entrepriseAmoId?: string): Promise<ActionResult<SelectAmoResult>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }
    const choix = z.string().uuid().optional().safeParse(entrepriseAmoId);
    if (!choix.success) {
      return { success: false, error: "AMO invalide" };
    }
    return await assignAmoAutomatiqueForUser(
      session.userId,
      choix.data ? { entrepriseAmoId: choix.data, par: "demandeur" } : undefined
    );
  } catch (error) {
    console.error("Erreur assignAmoAutomatique:", error);
    return { success: false, error: "Erreur lors de l'attribution de l'AMO" };
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
