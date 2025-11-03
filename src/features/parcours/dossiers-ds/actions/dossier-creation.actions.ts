"use server";

import { getSession } from "@/features/auth/server";
import type { ActionResult } from "@/shared/types";
import type { Step } from "../../core/domain/value-objects/step";
import { createPrefillDossier as createPrefillService } from "../services/ds-prefill.service";
import { syncDossierStatus } from "../services/ds-sync.service";
import { getParcoursComplet } from "../../core/services";

/**
 * Actions de création de dossiers prefill
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
    const session = await getSession();
    if (!session?.userId) {
      return {
        success: false,
        error: "Non connecté",
      };
    }

    // Créer le dossier prefill
    const result = await createPrefillService(prefillData, step);

    if (!result.success || !result.data) {
      return result;
    }

    // Synchroniser immédiatement le statut
    try {
      const parcours = await getParcoursComplet(session.userId);
      if (parcours) {
        await syncDossierStatus(
          parcours.parcours.id,
          step,
          result.data.dossier_number.toString()
        );
      }
    } catch (syncError) {
      // Ne pas bloquer si la sync échoue
      console.error("Erreur sync post-création:", syncError);
    }

    return result;
  } catch (error) {
    console.error("Erreur createPrefillDossier:", error);
    return {
      success: false,
      error: handleDSError(error),
    };
  }
}

/**
 * Gère les erreurs de l'API DS
 */
function handleDSError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erreur inconnue lors de la création du dossier";
  }

  const message = error.message.toLowerCase();

  if (message.includes("401") || message.includes("unauthorized")) {
    return "Erreur d'authentification avec Démarches Simplifiées. Veuillez contacter le support.";
  }

  if (message.includes("404")) {
    return "Démarche introuvable. Veuillez contacter le support.";
  }

  if (message.includes("422") || message.includes("validation")) {
    return "Les données envoyées ne sont pas valides. Veuillez vérifier votre simulation.";
  }

  if (message.includes("500") || message.includes("503")) {
    return "Démarches Simplifiées est temporairement indisponible. Veuillez réessayer dans quelques minutes.";
  }

  return "Erreur lors de la création du dossier. Veuillez réessayer ou contacter le support.";
}
