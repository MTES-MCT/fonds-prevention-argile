"use server";

import { resolveEspaceAgentAccess } from "@/features/backoffice/shared/actions/super-admin-access";
import { getAmoStatistiques } from "../services/amo-statistiques.service";
import type { AmoStatistiques } from "../domain/types";
import type { ActionResult } from "@/shared/types";

/**
 * Récupère les statistiques pour l'AMO connecté
 *
 * - AMO : filtre par son entrepriseAmoId
 * - SUPER_ADMIN : statistiques globales (tous AMO), lecture seule
 */
export async function getAmoStatistiquesAction(): Promise<ActionResult<AmoStatistiques>> {
  try {
    const access = await resolveEspaceAgentAccess();

    if (access.kind === "error") {
      return { success: false, error: access.error };
    }

    if (access.kind === "super-admin") {
      const statistiques = await getAmoStatistiques(null);
      return { success: true, data: statistiques };
    }

    const agent = access.agent;

    if (!agent.entrepriseAmoId) {
      return {
        success: false,
        error: "Aucune entreprise AMO associée à votre compte",
      };
    }

    const statistiques = await getAmoStatistiques(agent.entrepriseAmoId);

    return {
      success: true,
      data: statistiques,
    };
  } catch (error) {
    console.error("[getAmoStatistiquesAction] Erreur:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des statistiques",
    };
  }
}
