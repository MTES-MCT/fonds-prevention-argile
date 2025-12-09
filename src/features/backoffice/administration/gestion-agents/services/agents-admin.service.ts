import { agentsRepository } from "@/shared/database/repositories/agents.repository";
import type { Agent } from "@/shared/database/schema/agents";
import { DEPARTEMENTS } from "@/shared/constants/departements.constants";
import { agentPermissionsRepository } from "@/shared/database";
import {
  AgentWithPermissions,
  CreateAgentData,
  UpdateAgentData,
} from "../domain/types/agent-with-permissions.types";

/**
 * Récupère tous les agents avec leurs permissions
 */
export async function getAllAgentsWithPermissions(): Promise<AgentWithPermissions[]> {
  const agents = await agentsRepository.findAll();

  const agentsWithPermissions: AgentWithPermissions[] = await Promise.all(
    agents.map(async (agent) => {
      const departements = await agentPermissionsRepository.getDepartementsByAgentId(agent.id);
      return {
        agent,
        departements,
      };
    })
  );

  return agentsWithPermissions;
}

/**
 * Récupère un agent avec ses permissions par ID
 */
export async function getAgentWithPermissions(agentId: string): Promise<AgentWithPermissions | null> {
  const agent = await agentsRepository.findById(agentId);
  if (!agent) return null;

  const departements = await agentPermissionsRepository.getDepartementsByAgentId(agentId);

  return {
    agent,
    departements,
  };
}

/**
 * Crée un nouvel agent avec ses permissions
 */
export async function createAgent(data: CreateAgentData): Promise<AgentWithPermissions> {
  // Vérifier que l'email n'existe pas déjà
  const existingAgent = await agentsRepository.findByEmail(data.email);
  if (existingAgent) {
    throw new Error(`Un agent avec l'email "${data.email}" existe déjà`);
  }

  // Valider les codes départements
  if (data.departements && data.departements.length > 0) {
    const invalidCodes = data.departements.filter((code) => !DEPARTEMENTS[code]);
    if (invalidCodes.length > 0) {
      throw new Error(`Codes départements invalides : ${invalidCodes.join(", ")}`);
    }
  }

  // Créer l'agent (sans sub pour l'instant, sera mis à jour lors de la première connexion ProConnect)
  const agent = await agentsRepository.create({
    sub: `pending_${Date.now()}_${Math.random().toString(36).substring(7)}`, // Sub temporaire
    email: data.email,
    givenName: data.givenName,
    usualName: data.usualName,
    role: data.role,
  });

  // Ajouter les permissions si spécifiées
  let departements: string[] = [];
  if (data.departements && data.departements.length > 0) {
    await agentPermissionsRepository.addDepartements(agent.id, data.departements);
    departements = data.departements;
  }

  return {
    agent,
    departements,
  };
}

/**
 * Met à jour un agent et ses permissions
 */
export async function updateAgent(agentId: string, data: UpdateAgentData): Promise<AgentWithPermissions | null> {
  // Vérifier que l'agent existe
  const existingAgent = await agentsRepository.findById(agentId);
  if (!existingAgent) {
    return null;
  }

  // Vérifier l'unicité de l'email si modifié
  if (data.email && data.email !== existingAgent.email) {
    const agentWithEmail = await agentsRepository.findByEmail(data.email);
    if (agentWithEmail) {
      throw new Error(`Un agent avec l'email "${data.email}" existe déjà`);
    }
  }

  // Valider les codes départements si fournis
  if (data.departements) {
    const invalidCodes = data.departements.filter((code) => !DEPARTEMENTS[code]);
    if (invalidCodes.length > 0) {
      throw new Error(`Codes départements invalides : ${invalidCodes.join(", ")}`);
    }
  }

  // Mettre à jour l'agent
  const updateData: Partial<Agent> = {};
  if (data.email) updateData.email = data.email;
  if (data.givenName) updateData.givenName = data.givenName;
  if (data.usualName !== undefined) updateData.usualName = data.usualName;
  if (data.role) updateData.role = data.role;

  let updatedAgent = existingAgent;
  if (Object.keys(updateData).length > 0) {
    updatedAgent = (await agentsRepository.update(agentId, updateData)) || existingAgent;
  }

  // Mettre à jour les permissions si spécifiées
  let departements: string[];
  if (data.departements !== undefined) {
    await agentPermissionsRepository.replaceDepartements(agentId, data.departements);
    departements = data.departements;
  } else {
    departements = await agentPermissionsRepository.getDepartementsByAgentId(agentId);
  }

  return {
    agent: updatedAgent,
    departements,
  };
}

/**
 * Supprime un agent et ses permissions
 */
export async function deleteAgent(agentId: string): Promise<boolean> {
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
