"use server";

import { getSession } from "@/features/auth/server";
import { ROLES } from "@/features/auth/domain/value-objects/constants";
import { importAmosFromExcel } from "../services/amo-import.service";
import * as amoMutationsService from "../services/amo-mutations.service";
import { ActionResult } from "@/shared/types";
import { Amo } from "../domain/entities";

interface SeedResult {
  success: boolean;
  message: string;
  stats?: {
    entreprisesCreated: number;
    entreprisesUpdated: number;
    communesCreated: number;
    epciCreated: number;
  };
  errors?: string[];
}

/**
 * Importe les données AMO depuis un fichier Excel (admin uniquement)
 */
export async function importAmoFromExcel(formData: FormData, clearExisting: boolean = false): Promise<SeedResult> {
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
      message: error instanceof Error ? error.message : "Erreur inconnue lors de l'import",
    };
  }
}

/**
 * Met à jour une AMO
 */
export async function updateAmo(
  amoId: string,
  data: {
    nom: string;
    siret?: string;
    departements: string;
    emails: string;
    telephone?: string;
    adresse?: string;
    communes?: string[];
    epci?: string[];
  }
): Promise<ActionResult<Amo>> {
  try {
    const session = await getSession();

    if (!session?.userId || session.role !== ROLES.ADMIN) {
      return {
        success: false,
        error: "Accès non autorisé",
      };
    }

    const updated = await amoMutationsService.updateAmo(amoId, data);

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    console.error("Erreur updateAmo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Supprime une AMO
 */
export async function deleteAmo(amoId: string): Promise<ActionResult<void>> {
  try {
    const session = await getSession();

    if (!session?.userId || session.role !== ROLES.ADMIN) {
      return {
        success: false,
        error: "Accès non autorisé",
      };
    }

    await amoMutationsService.deleteAmo(amoId);

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("Erreur deleteAmo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}
