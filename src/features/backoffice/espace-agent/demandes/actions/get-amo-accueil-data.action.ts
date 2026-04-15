"use server";

import { resolveEspaceAgentAccess } from "@/features/backoffice/shared/actions/super-admin-access";
import { getAmoAccueilData } from "../services/amo-accueil.service";
import type { AmoAccueilData } from "../domain/types";
import type { ActionResult } from "@/shared/types";

/**
 * Récupère les données d'accueil pour l'AMO connecté
 *
 * - AMO : filtre par son entrepriseAmoId
 * - SUPER_ADMIN : accès global (tous les AMO), lecture seule
 */
export async function getAmoAccueilDataAction(): Promise<ActionResult<AmoAccueilData>> {
  try {
    const access = await resolveEspaceAgentAccess();

    if (access.kind === "error") {
      return { success: false, error: access.error };
    }

    if (access.kind === "super-admin") {
      const data = await getAmoAccueilData(null);
      return { success: true, data };
    }

    const agent = access.agent;

    if (!agent.entrepriseAmoId) {
      return {
        success: false,
        error: "Aucune entreprise AMO associée à votre compte",
      };
    }

    const data = await getAmoAccueilData(agent.entrepriseAmoId);

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("[getAmoAccueilDataAction] Erreur:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des données d'accueil",
    };
  }
}
