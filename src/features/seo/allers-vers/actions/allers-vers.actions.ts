"use server";

import { revalidatePath } from "next/cache";
import {
  getAllAllersVersWithRelations,
  getAllersVersByDepartement,
  getAllersVersByEpci,
  getAllersVersByDepartementOrEpci,
  importAllersVersFromExcel,
  deleteAllAllersVers,
} from "../services";
import type { ActionResult } from "@/shared/types";
import type { AllersVers } from "../domain/entities";
import type { AllersVersImportResult } from "../domain/types";

/**
 * Action pour récupérer tous les Allers Vers avec relations (admin)
 */
export async function getAllAllersVersWithRelationsAction(): Promise<
  ActionResult<
    Array<
      AllersVers & {
        departements: { codeDepartement: string }[];
        epci: { codeEpci: string }[];
      }
    >
  >
> {
  try {
    const allersVers = await getAllAllersVersWithRelations();

    return {
      success: true,
      data: allersVers,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des Allers Vers:", error);
    return {
      success: false,
      error: "Impossible de récupérer les Allers Vers",
    };
  }
}

/**
 * Action pour récupérer les Allers Vers par département
 */
export async function getAllersVersByDepartementAction(codeDepartement: string): Promise<ActionResult<AllersVers[]>> {
  try {
    const allersVers = await getAllersVersByDepartement(codeDepartement);

    return {
      success: true,
      data: allersVers,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des Allers Vers:", error);
    return {
      success: false,
      error: "Impossible de récupérer les Allers Vers",
    };
  }
}

/**
 * Action pour récupérer les Allers Vers par EPCI
 */
export async function getAllersVersByEpciAction(codeEpci: string): Promise<ActionResult<AllersVers[]>> {
  try {
    const allersVers = await getAllersVersByEpci(codeEpci);

    return {
      success: true,
      data: allersVers,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des Allers Vers:", error);
    return {
      success: false,
      error: "Impossible de récupérer les Allers Vers",
    };
  }
}

/**
 * Action pour récupérer les Allers Vers par département ou EPCI
 */
export async function getAllersVersByDepartementOrEpciAction(
  codeDepartement: string,
  codeEpci?: string
): Promise<ActionResult<AllersVers[]>> {
  try {
    const allersVers = await getAllersVersByDepartementOrEpci(codeDepartement, codeEpci);

    return {
      success: true,
      data: allersVers,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des Allers Vers:", error);
    return {
      success: false,
      error: "Impossible de récupérer les Allers Vers",
    };
  }
}

/**
 * Action pour importer des Allers Vers depuis un fichier Excel
 */
export async function importAllersVersAction(formData: FormData): Promise<ActionResult<AllersVersImportResult>> {
  try {
    const file = formData.get("file") as File;

    if (!file) {
      return {
        success: false,
        error: "Aucun fichier fourni",
      };
    }

    // Convertir le fichier en buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Supprimer les Allers Vers existants
    await deleteAllAllersVers();

    // Importer les nouveaux
    const result = await importAllersVersFromExcel(buffer);

    // Revalider les pages admin
    revalidatePath("/administration");

    if (result.success) {
      return {
        success: true,
        data: result,
      };
    } else {
      return {
        success: false,
        error: result.errors.join(", "),
      };
    }
  } catch (error) {
    console.error("Erreur lors de l'import des Allers Vers:", error);
    return {
      success: false,
      error: "Erreur lors de l'import des Allers Vers",
    };
  }
}
