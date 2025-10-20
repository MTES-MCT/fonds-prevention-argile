"use server";

import { getSession, ROLES } from "@/features/auth/server";
import type { ActionResult } from "@/shared/types";
import type {
  DemarcheDetailed,
  DossiersConnection,
  Dossier,
  DossiersFilters,
} from "../adapters/graphql/types";
import { graphqlClient } from "../adapters";

/**
 * Actions admin pour gérer les démarches DS
 */

/**
 * Récupère les détails d'une démarche
 */
export async function getDemarcheDetails(
  demarcheNumber: number
): Promise<ActionResult<DemarcheDetailed>> {
  try {
    const session = await getSession();

    if (!session?.userId || session.role !== ROLES.ADMIN) {
      return {
        success: false,
        error: "Accès non autorisé",
      };
    }

    const demarche = await graphqlClient.getDemarcheDetailed(demarcheNumber);

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
    console.error("Erreur getDemarcheDetails:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Récupère les dossiers d'une démarche avec filtres
 */
export async function getDossiers(
  demarcheNumber: number,
  filters?: DossiersFilters
): Promise<ActionResult<DossiersConnection>> {
  try {
    const session = await getSession();

    if (!session?.userId || session.role !== ROLES.ADMIN) {
      return {
        success: false,
        error: "Accès non autorisé",
      };
    }

    const dossiers = await graphqlClient.getDemarcheDossiers(
      demarcheNumber,
      filters
    );

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
    console.error("Erreur getDossiers:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Récupère un dossier par son numéro
 */
export async function getDossierByNumber(
  dossierNumber: number
): Promise<ActionResult<Dossier>> {
  try {
    const session = await getSession();

    if (!session?.userId || session.role !== ROLES.ADMIN) {
      return {
        success: false,
        error: "Accès non autorisé",
      };
    }

    const dossier = await graphqlClient.getDossier(dossierNumber);

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
    console.error("Erreur getDossierByNumber:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}
