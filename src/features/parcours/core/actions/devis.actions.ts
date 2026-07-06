"use server";

import { getSession } from "@/features/auth/server";
import type { ActionResult } from "@/shared/types";
import { createDevisDossier } from "../services/devis.service";

interface DevisResult {
  dossierUrl: string;
  dossierNumber: number;
  dossierId: string;
  message: string;
}

/**
 * Crée (ou récupère) le dossier DS devis (phase travaux) et retourne son URL.
 */
export async function envoyerDossierDevis(): Promise<ActionResult<DevisResult>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return {
        success: false,
        error: "Vous devez être connecté pour transmettre vos devis",
      };
    }

    return await createDevisDossier(session.userId);
  } catch (error) {
    console.error("Erreur envoi devis:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la création du dossier devis",
    };
  }
}
