"use server";

import { getSession } from "@/features/auth/server";
import type { ActionResult } from "@/shared/types";
import { createDiagnosticDossier } from "../services/diagnostic.service";

interface DiagnosticResult {
  dossierUrl: string;
  dossierNumber: number;
  dossierId: string;
  message: string;
}

/**
 * Crée (ou récupère) le dossier DS diagnostic et retourne son URL.
 */
export async function envoyerDossierDiagnostic(): Promise<ActionResult<DiagnosticResult>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return {
        success: false,
        error: "Vous devez être connecté pour transmettre votre diagnostic",
      };
    }

    return await createDiagnosticDossier(session.userId);
  } catch (error) {
    console.error("Erreur envoi diagnostic:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la création du dossier diagnostic",
    };
  }
}
