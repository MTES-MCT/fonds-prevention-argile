"use server";

import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { getAmoDossiersData } from "../services/amo-dossiers.service";
import type { AmoDossiersData } from "../domain/types";
import type { ActionResult } from "@/shared/types";

/**
 * Récupère les données des dossiers suivis pour l'AMO connecté
 *
 * Vérifie que l'agent est connecté et a une entreprise AMO associée
 */
export async function getAmoDossiersDataAction(): Promise<ActionResult<AmoDossiersData>> {
  try {
    // Récupérer l'agent courant
    const agentResult = await getCurrentAgent();

    if (!agentResult.success) {
      return {
        success: false,
        error: agentResult.error,
      };
    }

    const agent = agentResult.data;

    // Vérifier que l'agent a une entreprise AMO associée
    if (!agent.entrepriseAmoId) {
      return {
        success: false,
        error: "Aucune entreprise AMO associée à votre compte",
      };
    }

    // Récupérer les données des dossiers
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
