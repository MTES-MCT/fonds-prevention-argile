"use server";

import { z } from "zod";
import { checkRoleAccess } from "@/features/auth/server";
import { ROLES_PLATEFORME, UserRole } from "@/shared/domain/value-objects";
import type { ActionResult } from "@/shared/types";
import {
  getAllAgentsWithPermissions,
  getAgentWithPermissions,
  createAgent,
  updateAgent,
  deleteAgent,
  desactiverAgent,
  reactiverAgent,
  getAgentTraces,
} from "../services/agents-admin.service";
import { AgentWithPermissions } from "../domain/types";
import type { AgentTracesCount } from "@/shared/database/repositories/agents.repository";
import { structuresRepository } from "@/shared/database/repositories/structures.repository";
import { findListesDiffusionAvecEmail, type ListeDiffusion } from "../services/listes-diffusion.service";

/** Effet d'une désactivation sur les listes de diffusion, par nom de structure. */
export interface DesactivationSummary {
  listesRetirees: string[];
  listesConservees: string[];
}

// Rôle relu en base : un super-admin désactivé ou rétrogradé perd l'accès sans attendre la fin de sa session.
async function ensureSuperAdmin(): Promise<{ ok: true; agentId: string } | { ok: false }> {
  const acces = await checkRoleAccess([UserRole.SUPER_ADMINISTRATEUR]);
  return acces.hasAccess && acces.user ? { ok: true, agentId: acces.user.id } : { ok: false };
}

/**
 * Récupère tous les agents avec leurs permissions (super admin uniquement)
 */
export async function getAgentsAction(): Promise<ActionResult<AgentWithPermissions[]>> {
  try {
    const garde = await ensureSuperAdmin();

    if (!garde.ok) {
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
    const garde = await ensureSuperAdmin();

    if (!garde.ok) {
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

/** Structure proposée au rattachement d'un agent : ses habilitations font les rôles qu'il héritera. */
export interface StructureOptionAgent {
  id: string;
  nom: string;
  amo: string | null;
  allersVers: string | null;
}

/**
 * Liste les structures auxquelles rattacher un agent (super admin uniquement)
 */
export async function getStructuresOptionsAction(): Promise<ActionResult<StructureOptionAgent[]>> {
  try {
    const garde = await ensureSuperAdmin();

    if (!garde.ok) {
      return {
        success: false,
        error: "Accès non autorisé. Réservé aux super administrateurs.",
      };
    }

    const structures = await structuresRepository.findAllAvecHabilitations();
    return {
      success: true,
      // Une structure qui n'est qu'un expert ne donnerait aucun rôle à l'agent.
      data: structures
        .filter((structure) => structure.entrepriseAmo || structure.allersVers || !structure.expert)
        .map((structure) => ({
          id: structure.id,
          nom: structure.nom,
          amo: structure.entrepriseAmo?.nom ?? null,
          allersVers: structure.allersVers?.nom ?? null,
        })),
    };
  } catch (error) {
    console.error("Erreur getStructuresOptionsAction:", error);
    return {
      success: false,
      error: "Erreur lors du chargement des structures",
    };
  }
}

const compteSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("plateforme"), role: z.enum(ROLES_PLATEFORME) }),
  z.object({ type: z.literal("structure"), structureId: z.string().uuid("Structure invalide") }),
]);

const agentSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalide"),
  givenName: z.string().trim().min(1, "Le prénom est requis"),
  usualName: z.string().trim().optional(),
  compte: compteSchema,
  departements: z.array(z.string()).optional(),
});

const premiereErreur = (error: z.ZodError) => error.issues[0]?.message ?? "Données invalides";

/**
 * Crée un nouvel agent (super admin uniquement)
 */
export async function createAgentAction(input: unknown): Promise<ActionResult<AgentWithPermissions>> {
  try {
    const garde = await ensureSuperAdmin();

    if (!garde.ok) {
      return {
        success: false,
        error: "Accès non autorisé. Réservé aux super administrateurs.",
      };
    }

    const parsed = agentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: premiereErreur(parsed.error) };
    }

    const agent = await createAgent(parsed.data);

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
export async function updateAgentAction(agentId: string, input: unknown): Promise<ActionResult<AgentWithPermissions>> {
  try {
    const garde = await ensureSuperAdmin();

    if (!garde.ok) {
      return {
        success: false,
        error: "Accès non autorisé. Réservé aux super administrateurs.",
      };
    }

    const parsed = agentSchema.partial().safeParse(input);
    if (!parsed.success) {
      return { success: false, error: premiereErreur(parsed.error) };
    }

    const agent = await updateAgent(agentId, parsed.data);

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
 * Compte l'historique d'un agent (super admin uniquement).
 * Sert à la modale de suppression pour proposer la désactivation quand il reste des traces.
 */
export async function getAgentTracesAction(agentId: string): Promise<ActionResult<AgentTracesCount>> {
  try {
    const garde = await ensureSuperAdmin();

    if (!garde.ok) {
      return {
        success: false,
        error: "Accès non autorisé. Réservé aux super administrateurs.",
      };
    }

    return {
      success: true,
      data: await getAgentTraces(agentId),
    };
  } catch (error) {
    console.error("Erreur getAgentTracesAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Listes de diffusion des structures contenant l'adresse de l'agent (super admin uniquement).
 * Sert à annoncer l'impact du retrait avant de confirmer la désactivation.
 */
export async function getAgentListesDiffusionAction(agentId: string): Promise<ActionResult<ListeDiffusion[]>> {
  try {
    const garde = await ensureSuperAdmin();

    if (!garde.ok) {
      return {
        success: false,
        error: "Accès non autorisé. Réservé aux super administrateurs.",
      };
    }

    const agent = await getAgentWithPermissions(agentId);
    if (!agent) {
      return { success: false, error: "Agent non trouvé" };
    }

    return {
      success: true,
      data: await findListesDiffusionAvecEmail(agent.agent.email),
    };
  } catch (error) {
    console.error("Erreur getAgentListesDiffusionAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Désactive un agent (super admin uniquement) : coupe l'accès, garde l'historique.
 */
export async function desactiverAgentAction(
  agentId: string,
  raison?: string
): Promise<ActionResult<DesactivationSummary>> {
  try {
    const garde = await ensureSuperAdmin();

    if (!garde.ok) {
      return {
        success: false,
        error: "Accès non autorisé. Réservé aux super administrateurs.",
      };
    }

    // Se désactiver soi-même reviendrait à se verrouiller hors du backoffice.
    if (garde.agentId === agentId) {
      return {
        success: false,
        error: "Vous ne pouvez pas désactiver votre propre compte.",
      };
    }

    const resultat = await desactiverAgent(agentId, garde.agentId, raison);

    return {
      success: true,
      data: {
        listesRetirees: resultat.listesRetirees.map((l) => l.nom),
        listesConservees: resultat.listesConservees.map((l) => l.nom),
      },
    };
  } catch (error) {
    console.error("Erreur desactiverAgentAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Réactive un agent désactivé (super admin uniquement)
 */
export async function reactiverAgentAction(agentId: string): Promise<ActionResult<void>> {
  try {
    const garde = await ensureSuperAdmin();

    if (!garde.ok) {
      return {
        success: false,
        error: "Accès non autorisé. Réservé aux super administrateurs.",
      };
    }

    await reactiverAgent(agentId);

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("Erreur reactiverAgentAction:", error);
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
    const garde = await ensureSuperAdmin();

    if (!garde.ok) {
      return {
        success: false,
        error: "Accès non autorisé. Réservé aux super administrateurs.",
      };
    }

    // Empêcher la suppression de son propre compte
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
