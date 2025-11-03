import { prefillClient } from "../adapters/rest/client";
import type { Step } from "../../core/domain/value-objects/step";
import type { ActionResult } from "@/shared/types";

/**
 * Service de création de dossiers prefill DS
 */

interface PrefillDossierResult {
  dossier_url: string;
  dossier_number: number;
  dossier_id: string;
}

/**
 * Crée un dossier prérempli dans Démarches Simplifiées
 */
export async function createPrefillDossier(
  prefillData: Record<string, string | number | boolean | (string | number)[]>,
  step: Step
): Promise<ActionResult<PrefillDossierResult>> {
  try {
    // Validation des données avant envoi
    const validation = validatePrefillData(prefillData);

    if (!validation.isValid) {
      console.warn("Avertissements de validation:", validation.errors);
      // On ne bloque pas, juste un warning
    }

    // Validation additionnelle du client DS (format champ_, etc.)
    const clientErrors = prefillClient.validatePrefillData(prefillData);

    if (clientErrors.length > 0) {
      console.warn("Avertissements validation client DS:", clientErrors);
    }

    // Création du dossier avec le bon nom de méthode et bon ordre des paramètres
    const result = await prefillClient.createPrefillDossier(prefillData, step);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Erreur createPrefillDossier service:", error);

    // Laisser l'erreur remonter pour que l'action puisse la gérer
    throw error;
  }
}

/**
 * Valide les données avant envoi prefill
 */
export function validatePrefillData(data: Record<string, unknown>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validation basique
  if (!data || Object.keys(data).length === 0) {
    errors.push("Aucune donnée à envoyer");
  }

  // Validation des valeurs nulles/undefined
  Object.entries(data).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      errors.push(`Valeur manquante pour le champ ${key}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
