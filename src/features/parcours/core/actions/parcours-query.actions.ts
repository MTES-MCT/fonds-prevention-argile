"use server";

import { getSession } from "@/features/auth/server";
import type { ActionResult } from "@/shared/types";
import type { ParcoursState, Parcours } from "../domain/entities/parcours";
import type { Step } from "../domain/value-objects/step";
import {
  getParcoursStateWithPermissions,
  getFullParcours,
} from "../services/parcours-state.service";
import { DossierDS } from "../../dossiers-ds";

/**
 * Récupère l'état actuel du parcours avec permissions
 */
export async function getParcoursStatus(): Promise<
  ActionResult<{
    state: ParcoursState;
    nextAction: string;
    complete: boolean;
    canCreateDossier: boolean;
    canValidateDossier: boolean;
    canPassToNextStep: boolean;
  }>
> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const result = await getParcoursStateWithPermissions(session.userId);

    return {
      success: true,
      data: result,
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
 * Récupère le parcours complet avec dossiers
 */
export async function obtenirMonParcours(): Promise<
  ActionResult<{
    parcours: Parcours;
    dossiers: DossierDS[];
    isComplete: boolean;
    prochainEtape: Step | null;
  }>
> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const result = await getFullParcours(session.userId);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Erreur obtenirMonParcours:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération",
    };
  }
}
