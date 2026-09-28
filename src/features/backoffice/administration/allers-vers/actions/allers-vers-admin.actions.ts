"use server";

import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { AllersVers, allersVersRepository } from "@/shared/database";
import { ActionResult } from "@/shared/types";
import { revalidatePath } from "next/cache";
import { AllersVersImportResult } from "../domain";
import { importAllersVersFromExcel } from "../services/allers-vers-import.service";

/**
 * Allers-Vers simplifié pour les selects
 */
export interface AllersVersOption {
  id: string;
  nom: string;
  departements: string[];
}

/**
 * Récupère la liste des Allers-Vers pour les selects
 * Accessible aux agents ayant la permission AGENTS_READ (pour le formulaire agent)
 */
export async function getAllersVersOptions(): Promise<ActionResult<AllersVersOption[]>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.AGENTS_READ);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante",
    };
  }

  try {
    const allersVersList = await allersVersRepository.findAllWithRelations();

    const options: AllersVersOption[] = allersVersList.map((av) => ({
      id: av.id,
      nom: av.nom,
      departements: av.departements.map((d) => d.codeDepartement),
    }));

    return {
      success: true,
      data: options,
    };
  } catch (error) {
    console.error("Erreur getAllersVersOptions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

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
    if (clearExisting) {
      const deleteCheck = await checkBackofficePermission(BackofficePermission.ALLERS_VERS_DELETE);
      if (!deleteCheck.hasAccess) {
        return {
          success: false,
          error: "Permission insuffisante pour supprimer des Allers Vers",
        };
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await importAllersVersFromExcel(arrayBuffer, clearExisting);

    revalidatePath("/administration");

    // Échec seulement si rien n'a été écrit : un import partiel doit montrer ce qui est passé
    if (result.created + result.updated === 0 && result.errors.length > 0) {
      return {
        success: false,
        error: [result.purge, result.errors.join(", ")].filter(Boolean).join(" "),
      };
    }

    return {
      success: true,
      data: result,
    };
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
    horaires?: string | null;
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
      horaires: data.horaires === undefined ? undefined : data.horaires?.trim() || null,
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
