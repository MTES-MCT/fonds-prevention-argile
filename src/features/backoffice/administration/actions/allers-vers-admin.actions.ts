"use server";

import { AllersVers, allersVersRepository } from "@/shared/database";
import { ActionResult } from "@/shared/types";
import { revalidatePath } from "next/cache";
import { AllersVersImportResult } from "../domain";
import { importAllersVersFromExcel } from "../services/allers-vers-import.service";

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

    // Récupérer le flag clearExisting
    const clearExisting = formData.get("clearExisting") === "true";

    // Convertir le fichier en buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Importer avec ou sans suppression
    const result = await importAllersVersFromExcel(buffer, clearExisting);

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

/**
 * Action pour mettre à jour un Allers Vers
 */
export async function updateAllersVersAction(
  id: string,
  data: {
    nom: string;
    emails: string[];
    telephone: string;
    adresse: string;
    departements: string[];
    epci: string[];
  }
): Promise<ActionResult<AllersVers>> {
  try {
    const { allersVersRepository } = await import("@/shared/database/repositories");

    // Mettre à jour l'Allers Vers
    const updated = await allersVersRepository.update(id, {
      nom: data.nom,
      emails: data.emails,
      telephone: data.telephone,
      adresse: data.adresse,
    });

    if (!updated) {
      return {
        success: false,
        error: "Allers Vers non trouvé",
      };
    }

    // Mettre à jour les relations départements
    await allersVersRepository.updateDepartementsRelations(id, data.departements);

    // Mettre à jour les relations EPCI
    await allersVersRepository.updateEpciRelations(id, data.epci);

    // Revalider les pages admin et SEO
    revalidatePath("/administration");
    revalidatePath("/rga", "layout");

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'Allers Vers:", error);
    return {
      success: false,
      error: "Impossible de mettre à jour l'Allers Vers",
    };
  }
}

/**
 * Supprime tous les Allers Vers existants
 */
export async function deleteAllAllersVers(): Promise<void> {
  const allAllersVers = await allersVersRepository.findAll();

  for (const av of allAllersVers) {
    await allersVersRepository.delete(av.id);
  }
}
