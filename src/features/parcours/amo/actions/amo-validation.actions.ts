"use server";

import { ActionResult } from "@/shared/types/action-result.types";
import { getValidationByToken } from "../services/amo-validation.service";
import { ValidationAmoData } from "../domain/entities";

/**
 * Récupérer les données de validation par token
 *
 * TODO: Sécuriser également cette action quand la page sera dans l'espace AMO
 */
export async function getValidationDataByToken(token: string): Promise<ActionResult<ValidationAmoData>> {
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
