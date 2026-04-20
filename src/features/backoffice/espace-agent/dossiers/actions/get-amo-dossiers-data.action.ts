"use server";

import { resolveEspaceAgentAccess } from "@/features/backoffice/shared/actions/super-admin-access";
import { getAmoDossiersData } from "../services/amo-dossiers.service";
import type { AmoDossiersData } from "../domain/types";
import type { ActionResult } from "@/shared/types";

/**
 * Récupère les données des dossiers suivis pour l'AMO connecté
 *
 * - AMO : filtre par son entrepriseAmoId
 * - SUPER_ADMIN : dossiers globaux (tous AMO), lecture seule
 */
export async function getAmoDossiersDataAction(): Promise<ActionResult<AmoDossiersData>> {
  try {
    const access = await resolveEspaceAgentAccess();

    if (access.kind === "error") {
      return { success: false, error: access.error };
    }

    if (access.kind === "super-admin") {
      const data = await getAmoDossiersData(null);
      return { success: true, data };
    }

    const agent = access.agent;

    if (!agent.entrepriseAmoId) {
      return {
        success: false,
        error: "Aucune entreprise AMO associée à votre compte",
      };
    }

    const data = await getAmoDossiersData(agent.entrepriseAmoId);

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("[getAmoDossiersDataAction] Erreur:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des dossiers",
    };
  }
}
