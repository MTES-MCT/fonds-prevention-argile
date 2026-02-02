"use server";

import { ActionResult } from "@/shared/types/action-result.types";
import {
  approveValidation,
  rejectEligibility,
  rejectAccompagnement,
  getValidationByToken,
} from "../services/amo-validation.service";
import { ValidationAmoData } from "../domain/entities";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { UserRole } from "@/shared/domain/value-objects";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations } from "@/shared/database/schema";
import { eq } from "drizzle-orm";

/**
 * Vérifie que l'agent AMO connecté est bien propriétaire de la validation
 * Les admins peuvent tout valider, les AMO seulement leurs propres validations
 */
async function verifyAmoOwnership(
  validationId: string
): Promise<ActionResult<{ entrepriseAmoId: string }>> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Les admins peuvent tout valider
  if (user.role === UserRole.SUPER_ADMINISTRATEUR || user.role === UserRole.ADMINISTRATEUR) {
    return { success: true, data: { entrepriseAmoId: "" } };
  }

  // Pour les AMO, vérifier que la validation leur appartient
  if (user.role !== UserRole.AMO) {
    return { success: false, error: "Accès réservé aux AMO" };
  }

  if (!user.entrepriseAmoId) {
    return { success: false, error: "Votre compte AMO n'est pas configuré" };
  }

  // Récupérer l'entrepriseAmoId de la validation
  const [validation] = await db
    .select({ entrepriseAmoId: parcoursAmoValidations.entrepriseAmoId })
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.id, validationId))
    .limit(1);

  if (!validation) {
    return { success: false, error: "Validation non trouvée" };
  }

  if (validation.entrepriseAmoId !== user.entrepriseAmoId) {
    return { success: false, error: "Cette demande ne vous est pas destinée" };
  }

  return { success: true, data: { entrepriseAmoId: validation.entrepriseAmoId } };
}

/**
 * Valider que le logement est éligible (AMO)
 *
 * TODO: Déplacer la page de validation dans l'espace AMO (/administration/espace-agent/validations/[token])
 */
export async function validerLogementEligible(
  validationId: string,
  commentaire?: string
): Promise<ActionResult<{ message: string }>> {
  try {
    // Vérifier que l'agent AMO est propriétaire de cette validation
    const ownershipCheck = await verifyAmoOwnership(validationId);
    if (!ownershipCheck.success) {
      return { success: false, error: ownershipCheck.error };
    }

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
    // Vérifier que l'agent AMO est propriétaire de cette validation
    const ownershipCheck = await verifyAmoOwnership(validationId);
    if (!ownershipCheck.success) {
      return { success: false, error: ownershipCheck.error };
    }

    // Validation côté serveur
    if (!commentaire || commentaire.trim().length < 10) {
      return {
        success: false,
        error: "Un commentaire détaillé est requis pour justifier l'inéligibilité (minimum 10 caractères)",
      };
    }

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
    // Vérifier que l'agent AMO est propriétaire de cette validation
    const ownershipCheck = await verifyAmoOwnership(validationId);
    if (!ownershipCheck.success) {
      return { success: false, error: ownershipCheck.error };
    }

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
