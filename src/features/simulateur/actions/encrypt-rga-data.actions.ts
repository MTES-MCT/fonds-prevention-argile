"use server";

import { encryptData } from "../services/encryption.service";
import { PartialRGAFormData } from "../domain/entities";

export type EncryptRGADataResult =
  | { success: true; encrypted: string }
  | { success: false; error: string };

/**
 * Chiffre les données RGA côté serveur
 * Utilisé en mode embed pour transmission sécurisée via URL
 */
export async function encryptRGAData(
  data: PartialRGAFormData
): Promise<EncryptRGADataResult> {
  try {
    // Validation basique
    if (!data || typeof data !== "object") {
      return {
        success: false,
        error: "Données invalides",
      };
    }

    // Sérialiser en JSON
    const jsonString = JSON.stringify(data);

    // Chiffrer
    const encrypted = encryptData(jsonString);

    return {
      success: true,
      encrypted,
    };
  } catch (error) {
    console.error("[Encrypt RGA] Erreur:", error);

    return {
      success: false,
      error: "Erreur lors du chiffrement",
    };
  }
}
