"use server";

import { getDemarchesSimplifieesClient } from "@/lib/api/demarches-simplifiees/graphql";
import type {
  DemarcheDetailed,
  DossiersConnection,
  Dossier,
  DossiersFilters,
} from "@/lib/api/demarches-simplifiees/graphql/types";
import { ActionResult } from "@/lib/actions";

/**
 * Récupère les détails d'une démarche
 */
export async function getDemarcheDetails(
  demarcheNumber: number
): Promise<ActionResult<DemarcheDetailed>> {
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

/**
 * Récupère les statistiques d'une démarche
 * Calcule le nombre de dossiers par état
 */
export async function getDemarcheStatistics(demarcheNumber: number): Promise<
  ActionResult<{
    total: number;
    byState: Record<string, number>;
    archived: number;
  }>
> {
  try {
    const client = getDemarchesSimplifieesClient();
    const dossiersConnection = await client.getDemarcheDossiers(
      demarcheNumber,
      {
        first: 100, // Limite pour les stats de base
      }
    );

    if (!dossiersConnection) {
      return {
        success: false,
        error: "Impossible de récupérer les statistiques",
      };
    }

    const dossiers = dossiersConnection.nodes || [];

    const stats = dossiers.reduce(
      (acc, dossier) => {
        acc.total++;
        acc.byState[dossier.state] = (acc.byState[dossier.state] || 0) + 1;
        if (dossier.archived) acc.archived++;
        return acc;
      },
      {
        total: 0,
        byState: {} as Record<string, number>,
        archived: 0,
      }
    );

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error("Erreur lors du calcul des statistiques:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Récupère les dossiers récemment créés via préremplissage
 * (ceux qui sont encore en construction)
 */
export async function getPrefilledDossiers(
  demarcheNumber: number
): Promise<ActionResult<DossiersConnection>> {
  return getDossiers(demarcheNumber, {
    state: "en_construction",
    first: 50,
    order: "DESC",
  });
}
