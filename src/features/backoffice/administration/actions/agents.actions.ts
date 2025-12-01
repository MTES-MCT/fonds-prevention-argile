"use server";

import { getSession } from "@/features/auth/server";
import { isSuperAdminRole } from "@/shared/domain/value-objects";
import type { ActionResult } from "@/shared/types";
import type { AgentRole } from "@/shared/domain/value-objects";
import {
  getAllAgentsWithPermissions,
  getAgentWithPermissions,
  createAgent,
  updateAgent,
  deleteAgent,
} from "../services/agents-admin.service";
import { AgentWithPermissions, UpdateAgentData } from "../domain/types";

/**
 * Récupère tous les agents avec leurs permissions (super admin uniquement)
 */
export async function getAgentsAction(): Promise<ActionResult<AgentWithPermissions[]>> {
  try {
    const session = await getSession();

    if (!session?.userId || !isSuperAdminRole(session.role)) {
      return {
        success: false,
        error: "Accès non autorisé. Réservé aux super administrateurs.",
      };
    }

    const agents = await getAllAgentsWithPermissions();

    return {
      success: true,
      data: agents,
    };
  } catch (error) {
    console.error("Erreur getAgentsAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Récupère un agent par son ID (super admin uniquement)
 */
export async function getAgentByIdAction(agentId: string): Promise<ActionResult<AgentWithPermissions>> {
  try {
    const session = await getSession();

    if (!session?.userId || !isSuperAdminRole(session.role)) {
      return {
        success: false,
        error: "Accès non autorisé. Réservé aux super administrateurs.",
      };
    }

    const agent = await getAgentWithPermissions(agentId);

    if (!agent) {
      return {
        success: false,
        error: "Agent non trouvé",
      };
    }

    return {
      success: true,
      data: agent,
    };
  } catch (error) {
    console.error("Erreur getAgentByIdAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Crée un nouvel agent (super admin uniquement)
 */
export async function createAgentAction(data: {
  email: string;
  givenName: string;
  usualName?: string;
  role: AgentRole;
  departements?: string[];
}): Promise<ActionResult<AgentWithPermissions>> {
  try {
    const session = await getSession();

    if (!session?.userId || !isSuperAdminRole(session.role)) {
      return {
        success: false,
        error: "Accès non autorisé. Réservé aux super administrateurs.",
      };
    }

    // Validation basique
    if (!data.email || !data.email.includes("@")) {
      return {
        success: false,
        error: "Email invalide",
      };
    }

    if (!data.givenName || data.givenName.trim().length === 0) {
      return {
        success: false,
        error: "Le prénom est requis",
      };
    }

    if (!data.role) {
      return {
        success: false,
        error: "Le rôle est requis",
      };
    }

    const agent = await createAgent({
      email: data.email.toLowerCase().trim(),
      givenName: data.givenName.trim(),
      usualName: data.usualName?.trim(),
      role: data.role,
      departements: data.departements,
    });

    return {
      success: true,
      data: agent,
    };
  } catch (error) {
    console.error("Erreur createAgentAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Met à jour un agent (super admin uniquement)
 */
export async function updateAgentAction(
  agentId: string,
  data: {
    email?: string;
    givenName?: string;
    usualName?: string;
    role?: AgentRole;
    departements?: string[];
  }
): Promise<ActionResult<AgentWithPermissions>> {
  try {
    const session = await getSession();

    if (!session?.userId || !isSuperAdminRole(session.role)) {
      return {
        success: false,
        error: "Accès non autorisé. Réservé aux super administrateurs.",
      };
    }

    // Validation basique
    if (data.email && !data.email.includes("@")) {
      return {
        success: false,
        error: "Email invalide",
      };
    }

    if (data.givenName !== undefined && data.givenName.trim().length === 0) {
      return {
        success: false,
        error: "Le prénom ne peut pas être vide",
      };
    }

    const updateData: UpdateAgentData = {};
    if (data.email) updateData.email = data.email.toLowerCase().trim();
    if (data.givenName) updateData.givenName = data.givenName.trim();
    if (data.usualName !== undefined) updateData.usualName = data.usualName?.trim();
    if (data.role) updateData.role = data.role;
    if (data.departements !== undefined) updateData.departements = data.departements;

    const agent = await updateAgent(agentId, updateData);

    if (!agent) {
      return {
        success: false,
        error: "Agent non trouvé",
      };
    }

    return {
      success: true,
      data: agent,
    };
  } catch (error) {
    console.error("Erreur updateAgentAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Supprime un agent (super admin uniquement)
 */
export async function deleteAgentAction(agentId: string): Promise<ActionResult<void>> {
  try {
    const session = await getSession();

    if (!session?.userId || !isSuperAdminRole(session.role)) {
      return {
        success: false,
        error: "Accès non autorisé. Réservé aux super administrateurs.",
      };
    }

    // Empêcher la suppression de son propre compte
    // Note: session.userId est le sub ProConnect, pas l'id agent
    // On pourrait ajouter une vérification ici si nécessaire

    const deleted = await deleteAgent(agentId);

    if (!deleted) {
      return {
        success: false,
        error: "Agent non trouvé ou déjà supprimé",
      };
    }

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("Erreur deleteAgentAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}
