import {
  agentsRepository,
  type AgentAvecStructure,
  type AgentTracesCount,
} from "@/shared/database/repositories/agents.repository";
import type { Agent } from "@/shared/database/schema/agents";
import { formatTracesResume } from "../domain/value-objects/agent-traces";
import { db } from "@/shared/database/client";
import { findListesDiffusionAvecEmail, retirerEmailDesListes, type ListeDiffusion } from "./listes-diffusion.service";

/** Résultat d'une désactivation : l'agent, et l'effet sur les listes de diffusion. */
export interface DesactivationResult {
  agent: Agent;
  listesRetirees: ListeDiffusion[];
  /** Listes où l'adresse a été gardée faute de destinataire de remplacement. */
  listesConservees: ListeDiffusion[];
}
import { DEPARTEMENTS } from "@/shared/constants/departements.constants";
import { agentPermissionsRepository } from "@/shared/database";
import { AgentWithPermissions, CreateAgentData, UpdateAgentData } from "../domain/types/agent-with-permissions.types";

/** Projection d'un agent pour l'administration : ses départements et les lignes de sa structure. */
function versAgentWithPermissions(agent: AgentAvecStructure, departements: string[]): AgentWithPermissions {
  return {
    agent: {
      id: agent.id,
      sub: agent.sub,
      email: agent.email,
      givenName: agent.givenName,
      usualName: agent.usualName,
      uid: agent.uid,
      siret: agent.siret,
      phone: agent.phone,
      organizationalUnit: agent.organizationalUnit,
      role: agent.role,
      structureId: agent.structureId,
      entrepriseAmoId: agent.entrepriseAmoId,
      allersVersId: agent.allersVersId,
      desactiveAt: agent.desactiveAt,
      desactiveRaison: agent.desactiveRaison,
      lastLogin: agent.lastLogin,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    },
    departements,
    structure: agent.structure,
    entrepriseAmo: agent.entrepriseAmo,
    allersVers: agent.allersVers,
  };
}

/**
 * Récupère tous les agents avec leurs permissions, leur structure et ses habilitations
 */
export async function getAllAgentsWithPermissions(): Promise<AgentWithPermissions[]> {
  const agents = await agentsRepository.findAllAvecStructure();

  return Promise.all(
    agents.map(async (agent) =>
      versAgentWithPermissions(agent, await agentPermissionsRepository.getDepartementsByAgentId(agent.id))
    )
  );
}

/**
 * Récupère un agent avec ses permissions par ID
 */
export async function getAgentWithPermissions(agentId: string): Promise<AgentWithPermissions | null> {
  const agent = await agentsRepository.findByIdAvecStructure(agentId);
  if (!agent) return null;

  return versAgentWithPermissions(agent, await agentPermissionsRepository.getDepartementsByAgentId(agentId));
}

function validerDepartements(departements: string[] | undefined): void {
  const invalidCodes = (departements ?? []).filter((code) => !DEPARTEMENTS[code]);
  if (invalidCodes.length > 0) {
    throw new Error(`Codes départements invalides : ${invalidCodes.join(", ")}`);
  }
}

/**
 * Crée un nouvel agent avec ses permissions. Son rôle vient de son compte : plateforme, ou structure.
 */
export async function createAgent(data: CreateAgentData): Promise<AgentWithPermissions> {
  const existingAgent = await agentsRepository.findByEmail(data.email);
  if (existingAgent) {
    throw new Error(`Un agent avec l'email "${data.email}" existe déjà`);
  }
  validerDepartements(data.departements);

  // Sans sub pour l'instant : la première connexion ProConnect écrit le vrai
  const agent = await agentsRepository.create({
    sub: `pending_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    email: data.email,
    givenName: data.givenName,
    usualName: data.usualName,
    compte: data.compte,
  });

  if (data.departements && data.departements.length > 0) {
    await agentPermissionsRepository.addDepartements(agent.id, data.departements);
  }

  return (await getAgentWithPermissions(agent.id))!;
}

/**
 * Met à jour un agent et ses permissions
 */
export async function updateAgent(agentId: string, data: UpdateAgentData): Promise<AgentWithPermissions | null> {
  const existingAgent = await agentsRepository.findById(agentId);
  if (!existingAgent) {
    return null;
  }

  if (data.email && data.email !== existingAgent.email) {
    const agentWithEmail = await agentsRepository.findByEmail(data.email);
    if (agentWithEmail) {
      throw new Error(`Un agent avec l'email "${data.email}" existe déjà`);
    }
  }
  validerDepartements(data.departements);

  await agentsRepository.update(agentId, {
    email: data.email,
    givenName: data.givenName,
    usualName: data.usualName,
    compte: data.compte,
  });

  if (data.departements !== undefined) {
    await agentPermissionsRepository.replaceDepartements(agentId, data.departements);
  }

  return getAgentWithPermissions(agentId);
}

/**
 * Désactive un agent : coupe son accès en conservant son historique nominatif,
 * et le retire des listes de diffusion des structures dans la même transaction.
 */
export async function desactiverAgent(
  agentId: string,
  parAgentId: string,
  raison?: string
): Promise<DesactivationResult> {
  const existant = await agentsRepository.findById(agentId);
  if (!existant) {
    throw new Error("Agent non trouvé");
  }
  if (existant.desactiveAt) {
    throw new Error("Cet agent est déjà désactivé");
  }

  const listes = await findListesDiffusionAvecEmail(existant.email);

  return await db.transaction(async (tx) => {
    const agent = await agentsRepository.desactiver(agentId, parAgentId, raison?.trim() || null, tx);
    if (!agent) {
      throw new Error("Échec de la désactivation");
    }

    const { retirees, conservees } = await retirerEmailDesListes(existant.email, listes, tx);

    return { agent, listesRetirees: retirees, listesConservees: conservees };
  });
}

/**
 * Réactive un agent désactivé.
 */
export async function reactiverAgent(agentId: string): Promise<Agent> {
  const existant = await agentsRepository.findById(agentId);
  if (!existant) {
    throw new Error("Agent non trouvé");
  }
  if (!existant.desactiveAt) {
    throw new Error("Cet agent est déjà actif");
  }

  const agent = await agentsRepository.reactiver(agentId);
  if (!agent) {
    throw new Error("Échec de la réactivation");
  }

  return agent;
}

/**
 * Compte l'historique nominatif laissé par un agent (ce qu'une suppression effacerait).
 */
export async function getAgentTraces(agentId: string): Promise<AgentTracesCount> {
  return await agentsRepository.countTraces(agentId);
}

/**
 * Supprime un agent et ses permissions.
 * Refuse dès qu'il reste une trace nominative : la désactivation est alors la bonne porte.
 */
export async function deleteAgent(agentId: string): Promise<boolean> {
  const traces = await agentsRepository.countTraces(agentId);
  if (traces.total > 0) {
    throw new Error(
      `Cet agent a laissé un historique (${formatTracesResume(traces)}). ` +
        `Le supprimer effacerait ces traces : désactivez-le à la place.`
    );
  }

  // Les permissions sont supprimées automatiquement via ON DELETE CASCADE
  return await agentsRepository.delete(agentId);
}

/**
 * Vérifie si un email est déjà utilisé par un agent
 */
export async function isEmailTaken(email: string, excludeAgentId?: string): Promise<boolean> {
  const agent = await agentsRepository.findByEmail(email);
  if (!agent) return false;
  if (excludeAgentId && agent.id === excludeAgentId) return false;
  return true;
}
