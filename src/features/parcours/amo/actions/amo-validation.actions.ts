"use server";

import { ActionResult } from "@/shared/types/action-result.types";
import {
  approveValidation,
  rejectEligibility,
  rejectAccompagnement,
  getValidationByToken,
} from "../services/amo-validation.service";
import { ValidationAmoComplete, ValidationAmoData } from "../domain/entities";

/**
 * Valider que le logement est éligible (AMO)
 */
export async function validerLogementEligible(
  validationId: string,
  commentaire?: string
): Promise<ActionResult<{ message: string }>> {
  try {
    const result = await approveValidation(validationId, commentaire);
    return result;
  } catch (error) {
    console.error("Erreur validerLogementEligible:", error);
    return {
      success: false,
      error: "Erreur lors de la validation",
    };
  }
}

/**
 * Refuser le logement (non éligible) (AMO)
 */
export async function refuserLogementNonEligible(
  validationId: string,
  commentaire: string
): Promise<ActionResult<{ message: string }>> {
  try {
    const result = await rejectEligibility(validationId, commentaire);
    return result;
  } catch (error) {
    console.error("Erreur refuserLogementNonEligible:", error);
    return {
      success: false,
      error: "Erreur lors du refus",
    };
  }
}

/**
 * Refuser l'accompagnement (AMO)
 */
export async function refuserAccompagnement(
  validationId: string,
  commentaire: string
): Promise<ActionResult<{ message: string }>> {
  try {
    const result = await rejectAccompagnement(validationId, commentaire);
    return result;
  } catch (error) {
    console.error("Erreur refuserAccompagnement:", error);
    return {
      success: false,
      error: "Erreur lors du refus",
    };
  }
}

/**
 * Récupérer les données de validation par token
 */
export async function getValidationDataByToken(
  token: string
): Promise<ActionResult<ValidationAmoData>> {
  try {
    const result = await getValidationByToken(token);
    return result;
  } catch (error) {
    console.error("Erreur getValidationDataByToken:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des données",
    };
  }
}
