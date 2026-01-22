"use server";

import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { getAmoStatistiques } from "../services/amo-statistiques.service";
import type { AmoStatistiques } from "../domain/types";
import type { ActionResult } from "@/shared/types";

/**
 * Récupère les statistiques pour l'AMO connecté
 *
 * Vérifie que l'agent est connecté et a une entreprise AMO associée
 */
export async function getAmoStatistiquesAction(): Promise<ActionResult<AmoStatistiques>> {
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

    // Récupérer les statistiques
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
