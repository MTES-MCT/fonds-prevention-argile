"use server";

import { getSession } from "@/features/auth/server";
import type { ActionResult } from "@/shared/types";
import {
  createEligibiliteDossier,
  canCreateEligibiliteDossier,
} from "../services/eligibilite.service";
import { PartialRGAFormData } from "@/features/simulateur-rga";

interface EligibiliteResult {
  dossierUrl: string;
  dossierNumber: number;
  dossierId: string;
  message: string;
}

/**
 * Crée un dossier d'éligibilité avec les données RGA
 */
export async function envoyerDossierEligibiliteAvecDonnees(
  rgaData: PartialRGAFormData
): Promise<ActionResult<EligibiliteResult>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return {
        success: false,
        error: "Vous devez être connecté pour envoyer votre dossier",
      };
    }

    const result = await createEligibiliteDossier(session.userId, rgaData);

    return result;
  } catch (error) {
    console.error("Erreur envoi éligibilité:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de l'envoi du dossier",
    };
  }
}

/**
 * Vérifie si l'utilisateur peut créer un dossier d'éligibilité
 */
export async function peutCreerDossierEligibilite(): Promise<
  ActionResult<boolean>
> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: true, data: false };
    }

    const canCreate = await canCreateEligibiliteDossier(session.userId);

    return {
      success: true,
      data: canCreate,
    };
  } catch (error) {
    return {
      success: false,
      error:
        "Erreur lors de la vérification " +
        (error instanceof Error ? error.message : "inconnue"),
    };
  }
}
