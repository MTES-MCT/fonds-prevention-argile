"use server";

import { getDemarchesSimplifieesClient } from "@/lib/api/demarches-simplifiees/graphql";
import type {
  DemarcheDetailed,
  DossiersConnection,
  Dossier,
  DossiersFilters,
} from "@/lib/api/demarches-simplifiees/graphql/types";
import { ActionResult } from "@/lib/actions";
import { ROLES } from "@/lib/auth";
import { getSession } from "@/lib/auth/services/auth.service";

/**
 * Récupère les détails d'une démarche
 */
export async function getDemarcheDetails(
  demarcheNumber: number
): Promise<ActionResult<DemarcheDetailed>> {
  // Vérification du rôle admin
  const session = await getSession();

  if (!session?.userId || session.role !== ROLES.ADMIN) {
    return {
      success: false,
      error: "Accès non autorisé",
    };
  }

  try {
    const client = getDemarchesSimplifieesClient();
    const demarche = await client.getDemarcheDetailed(demarcheNumber);

    if (!demarche) {
      return {
        success: false,
        error: `Démarche ${demarcheNumber} non trouvée`,
      };
    }

    return {
      success: true,
      data: demarche,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération de la démarche:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Récupère les dossiers d'une démarche avec filtres optionnels
 */
export async function getDossiers(
  demarcheNumber: number,
  filters?: DossiersFilters
): Promise<ActionResult<DossiersConnection>> {
  // Vérification du rôle admin
  const session = await getSession();

  if (!session?.userId || session.role !== ROLES.ADMIN) {
    return {
      success: false,
      error: "Accès non autorisé",
    };
  }

  try {
    const client = getDemarchesSimplifieesClient();
    const dossiers = await client.getDemarcheDossiers(demarcheNumber, filters);

    if (!dossiers) {
      return {
        success: false,
        error: "Impossible de récupérer les dossiers",
      };
    }

    return {
      success: true,
      data: dossiers,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des dossiers:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Récupère un dossier spécifique par son numéro
 */
export async function getDossierByNumber(
  dossierNumber: number
): Promise<ActionResult<Dossier>> {
  // Vérification du rôle admin
  const session = await getSession();

  if (!session?.userId || session.role !== ROLES.ADMIN) {
    return {
      success: false,
      error: "Accès non autorisé",
    };
  }

  try {
    const client = getDemarchesSimplifieesClient();
    const dossier = await client.getDossier(dossierNumber);

    if (!dossier) {
      return {
        success: false,
        error: `Dossier ${dossierNumber} non trouvé`,
      };
    }

    return {
      success: true,
      data: dossier,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération du dossier:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}
