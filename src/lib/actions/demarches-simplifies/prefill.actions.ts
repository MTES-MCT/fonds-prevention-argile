"use server";

import { prefillClient } from "@/lib/api/demarches-simplifiees/rest";
import type {
  PrefillData,
  CreateDossierResponse,
} from "@/lib/api/demarches-simplifiees/rest/types";
import type { ActionResult } from "../types";
import { Step } from "@/lib/parcours/parcours.types";
import { RGAFormData } from "@/lib/form-rga";
import { getSession } from "@/lib/auth/services/auth.service";
import { syncDossierEligibiliteStatus } from "@/lib/database/services/dossier-ds-sync.service";

/**
 * Crée un dossier prérempli dans Démarches Simplifiées
 *
 * Action principale utilisée par le parcours d'éligibilité
 * pour créer un vrai dossier avec les données du simulateur RGA
 *
 * @param data - Les données transformées depuis RGA vers le format DS
 */
export async function createPrefillDossier(
  data: PrefillData,
  step: Step
): Promise<ActionResult<CreateDossierResponse>> {
  try {
    // Validation des données
    const errors = prefillClient.validatePrefillData(data);

    if (errors.length > 0) {
      console.warn("Avertissements de validation DS:", errors);
      // On ne bloque pas si ce sont juste des avertissements
      // Les champs requis sont déjà validés côté RGA
    }

    // Création du dossier
    const result = await prefillClient.createPrefillDossier(data, step);

    // Synchroniser immédiatement le statut après création
    try {
      const session = await getSession();
      if (session?.userId) {
        await syncDossierEligibiliteStatus(session.userId, step);
      }
    } catch (syncError) {
      // Ne pas bloquer si la sync échoue
      console.error("Erreur lors de la sync post-création:", syncError);
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Erreur création dossier DS:", error);

    // Gestion d'erreurs spécifiques de l'API DS
    if (error instanceof Error) {
      if (
        error.message.includes("401") ||
        error.message.includes("Unauthorized")
      ) {
        return {
          success: false,
          error:
            "Erreur d'authentification avec Démarches Simplifiées. Veuillez contacter le support.",
        };
      }

      if (error.message.includes("404")) {
        return {
          success: false,
          error: "Démarche introuvable. Veuillez contacter le support.",
        };
      }

      if (
        error.message.includes("422") ||
        error.message.includes("validation")
      ) {
        return {
          success: false,
          error:
            "Les données envoyées ne sont pas valides. Veuillez vérifier votre simulation.",
        };
      }

      if (error.message.includes("500") || error.message.includes("503")) {
        return {
          success: false,
          error:
            "Démarches Simplifiées est temporairement indisponible. Veuillez réessayer dans quelques minutes.",
        };
      }
    }

    return {
      success: false,
      error:
        "Erreur lors de la création du dossier. Veuillez réessayer ou contacter le support.",
    };
  }
}

/**
 * Valide les données avant envoi (optionnel)
 *
 * Peut être utilisé pour vérifier les données avant l'envoi réel
 * Utile pour du debug ou des vérifications préalables
 *
 * @param data - Les données à valider
 */
export async function validatePrefillData(
  data: PrefillData
): Promise<ActionResult<{ valid: boolean; warnings: string[] }>> {
  try {
    const warnings = prefillClient.validatePrefillData(data);

    return {
      success: true,
      data: {
        valid: warnings.length === 0,
        warnings,
      },
    };
  } catch (error) {
    console.error("Erreur lors de la validation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur de validation",
    };
  }
}
