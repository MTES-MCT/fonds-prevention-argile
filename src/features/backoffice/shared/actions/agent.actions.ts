"use server";

import { getCurrentUser } from "@/features/auth/services/user.service";
import { getSession } from "@/features/auth/services/session.service";
import { AUTH_METHODS } from "@/features/auth/domain/value-objects/constants";
import { getAgentById } from "../services/agent.service";
import type { Agent } from "@/shared/database/schema/agents";
import type { ActionResult } from "@/shared/types";

/**
 * Récupère l'agent courant connecté via ProConnect
 *
 * Logique :
 * 1. Vérifie que l'utilisateur est connecté via ProConnect
 * 2. Récupère l'agent en BDD via son ID (stocké dans session.userId)
 * 3. Retourne l'agent ou une erreur
 */
export async function getCurrentAgent(): Promise<ActionResult<Agent>> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return {
        success: false,
        error: "Utilisateur non connecté",
      };
    }

    if (user.authMethod !== AUTH_METHODS.PROCONNECT) {
      return {
        success: false,
        error: "Authentification ProConnect requise",
      };
    }

    // Récupérer la session pour avoir accès à l'ID de l'agent
    const session = await getSession();

    if (!session) {
      return {
        success: false,
        error: "Session invalide",
      };
    }

    // Récupérer l'agent par son ID (session.userId = agent.id)
    const agent = await getAgentById(session.userId);

    if (!agent) {
      return {
        success: false,
        error: "Agent non enregistré dans le système",
      };
    }

    return {
      success: true,
      data: agent,
    };
  } catch (error) {
    console.error("[getCurrentAgent] Erreur:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération de l'agent",
    };
  }
}
