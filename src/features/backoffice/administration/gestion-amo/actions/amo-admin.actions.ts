"use server";

import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import * as amoMutationsService from "../../../../parcours/amo/services/amo-mutations.service";
import { ActionResult } from "@/shared/types";
import { importAmosFromExcel } from "@/features/backoffice/administration/gestion-amo/services/amo-import.service";
import { Amo } from "@/features/parcours/amo";
import { entreprisesAmoRepo } from "@/shared/database";

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
 * Entreprise AMO simplifiée pour les selects
 */
export interface EntrepriseAmoOption {
  id: string;
  nom: string;
  siret: string;
}

/**
 * Récupère la liste des entreprises AMO pour les selects
 * Accessible aux agents ayant la permission AGENTS_READ (pour le formulaire agent)
 */
export async function getEntreprisesAmoOptions(): Promise<ActionResult<EntrepriseAmoOption[]>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.AGENTS_READ);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante",
    };
  }

  try {
    const entreprises = await entreprisesAmoRepo.findAll();

    const options: EntrepriseAmoOption[] = entreprises.map((e) => ({
      id: e.id,
      nom: e.nom,
      siret: e.siret,
    }));

    return {
      success: true,
      data: options,
    };
  } catch (error) {
    console.error("Erreur getEntreprisesAmoOptions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

export async function importAmoFromExcel(formData: FormData, clearExisting: boolean = false): Promise<SeedResult> {
  // Vérifier la permission d'import
  const permissionCheck = await checkBackofficePermission(BackofficePermission.AMO_IMPORT);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      message: "Permission insuffisante pour importer des AMO",
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
  // Vérifier la permission d'écriture
  const permissionCheck = await checkBackofficePermission(BackofficePermission.AMO_WRITE);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante pour modifier une AMO",
    };
  }

  try {
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

export async function deleteAmo(amoId: string): Promise<ActionResult<void>> {
  // Vérifier la permission de suppression
  const permissionCheck = await checkBackofficePermission(BackofficePermission.AMO_DELETE);

  if (!permissionCheck.hasAccess) {
    return {
      success: false,
      error: "Permission insuffisante pour supprimer une AMO",
    };
  }

  try {
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
