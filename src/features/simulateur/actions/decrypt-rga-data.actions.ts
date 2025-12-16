"use server";

import { decryptData } from "../services/encryption.service";
import { PartialRGAFormData } from "../domain/entities";

export type DecryptRGADataResult =
  | { success: true; data: PartialRGAFormData }
  | { success: false; error: string };

/**
 * Déchiffre les données RGA côté serveur
 * Utilisé en mode embed pour récupération depuis URL
 */
export async function decryptRGAData(
  encrypted: string
): Promise<DecryptRGADataResult> {
  try {
    // Validation
    if (!encrypted || typeof encrypted !== "string") {
      return {
        success: false,
        error: "Données chiffrées invalides",
      };
    }

    // Déchiffrer
    const jsonString = decryptData(encrypted);

    // Parser le JSON
    const data = JSON.parse(jsonString) as PartialRGAFormData;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("[Decrypt RGA] Erreur:", error);

    return {
      success: false,
      error: "Erreur lors du déchiffrement",
    };
  }
}
