"use server";

import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { getAmoAccueilData } from "../services/amo-accueil.service";
import type { AmoAccueilData } from "../domain/types";
import type { ActionResult } from "@/shared/types";

/**
 * Récupère les données d'accueil pour l'AMO connecté
 *
 * Vérifie que l'agent est connecté et a une entreprise AMO associée
 */
export async function getAmoAccueilDataAction(): Promise<ActionResult<AmoAccueilData>> {
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

    // Récupérer les données d'accueil
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
