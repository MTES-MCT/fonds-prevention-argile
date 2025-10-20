"use server";

import { getSession } from "@/features/auth/server";
import { ROLES } from "@/features/auth/domain/value-objects/constants";
import { importAmosFromExcel } from "../services/amo-import.service";

interface SeedResult {
  success: boolean;
  message: string;
  stats?: {
    entreprisesCreated: number;
    communesCreated: number;
  };
  errors?: string[];
}

/**
 * Importe les données AMO depuis un fichier Excel (admin uniquement)
 */
export async function importAmoFromExcel(
  formData: FormData,
  clearExisting: boolean = false
): Promise<SeedResult> {
  const session = await getSession();

  if (!session || session.role !== ROLES.ADMIN) {
    return {
      success: false,
      message: "Action non autorisée. Accès réservé aux administrateurs.",
    };
  }

  try {
    const result = await importAmosFromExcel(formData, clearExisting);
    return result;
  } catch (error) {
    console.error("Erreur lors de l'import AMO:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors de l'import",
    };
  }
}
