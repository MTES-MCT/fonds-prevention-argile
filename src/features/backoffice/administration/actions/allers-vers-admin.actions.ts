"use server";

import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { AllersVers, allersVersRepository } from "@/shared/database";
import { ActionResult } from "@/shared/types";
import { revalidatePath } from "next/cache";
import { AllersVersImportResult } from "../domain";
import { importAllersVersFromExcel } from "../services/allers-vers-import.service";

export async function importAllersVersAction(formData: FormData): Promise<ActionResult<AllersVersImportResult>> {
  // Vérifier la permission d'import
  const permissionCheck = await checkBackofficePermission(BackofficePermission.ALLERS_VERS_IMPORT);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante pour importer des Allers Vers",
    };
  }

  try {
    const file = formData.get("file") as File;

    if (!file) {
      return {
        success: false,
        error: "Aucun fichier fourni",
      };
    }

    const clearExisting = formData.get("clearExisting") === "true";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await importAllersVersFromExcel(buffer, clearExisting);
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
  // Vérifier la permission d'écriture
  const permissionCheck = await checkBackofficePermission(BackofficePermission.ALLERS_VERS_WRITE);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante pour modifier un Allers Vers",
    };
  }

  try {
    const { allersVersRepository } = await import("@/shared/database/repositories");

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

    await allersVersRepository.updateDepartementsRelations(id, data.departements);
    await allersVersRepository.updateEpciRelations(id, data.epci);

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

export async function deleteAllAllersVers(): Promise<ActionResult<void>> {
  // Vérifier la permission de suppression
  const permissionCheck = await checkBackofficePermission(BackofficePermission.ALLERS_VERS_DELETE);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante pour supprimer des Allers Vers",
    };
  }

  try {
    const allAllersVers = await allersVersRepository.findAll();

    for (const av of allAllersVers) {
      await allersVersRepository.delete(av.id);
    }

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("Erreur lors de la suppression des Allers Vers:", error);
    return {
      success: false,
      error: "Impossible de supprimer les Allers Vers",
    };
  }
}
