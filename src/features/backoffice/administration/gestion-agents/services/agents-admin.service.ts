import { agentsRepository } from "@/shared/database/repositories/agents.repository";
import type { Agent } from "@/shared/database/schema/agents";
import { DEPARTEMENTS } from "@/shared/constants/departements.constants";
import { agentPermissionsRepository, entreprisesAmoRepo } from "@/shared/database";
import { UserRole } from "@/shared/domain/value-objects";
import { AgentWithPermissions, CreateAgentData, UpdateAgentData } from "../domain/types/agent-with-permissions.types";

/**
 * Récupère tous les agents avec leurs permissions et entreprise AMO
 */
export async function getAllAgentsWithPermissions(): Promise<AgentWithPermissions[]> {
  const agentsWithAmo = await agentsRepository.findAllWithEntrepriseAmo();

  const agentsWithPermissions: AgentWithPermissions[] = await Promise.all(
    agentsWithAmo.map(async (agentWithAmo) => {
      const departements = await agentPermissionsRepository.getDepartementsByAgentId(agentWithAmo.id);
      return {
        agent: {
          id: agentWithAmo.id,
          sub: agentWithAmo.sub,
          email: agentWithAmo.email,
          givenName: agentWithAmo.givenName,
          usualName: agentWithAmo.usualName,
          uid: agentWithAmo.uid,
          siret: agentWithAmo.siret,
          phone: agentWithAmo.phone,
          organizationalUnit: agentWithAmo.organizationalUnit,
          role: agentWithAmo.role,
          entrepriseAmoId: agentWithAmo.entrepriseAmoId,
          createdAt: agentWithAmo.createdAt,
          updatedAt: agentWithAmo.updatedAt,
        },
        departements,
        entrepriseAmo: agentWithAmo.entrepriseAmo,
      };
    })
  );

  return agentsWithPermissions;
}

/**
 * Récupère un agent avec ses permissions par ID
 */
export async function getAgentWithPermissions(agentId: string): Promise<AgentWithPermissions | null> {
  const agentWithAmo = await agentsRepository.findByIdWithEntrepriseAmo(agentId);
  if (!agentWithAmo) return null;

  const departements = await agentPermissionsRepository.getDepartementsByAgentId(agentId);

  return {
    agent: {
      id: agentWithAmo.id,
      sub: agentWithAmo.sub,
      email: agentWithAmo.email,
      givenName: agentWithAmo.givenName,
      usualName: agentWithAmo.usualName,
      uid: agentWithAmo.uid,
      siret: agentWithAmo.siret,
      phone: agentWithAmo.phone,
      organizationalUnit: agentWithAmo.organizationalUnit,
      role: agentWithAmo.role,
      entrepriseAmoId: agentWithAmo.entrepriseAmoId,
      createdAt: agentWithAmo.createdAt,
      updatedAt: agentWithAmo.updatedAt,
    },
    departements,
    entrepriseAmo: agentWithAmo.entrepriseAmo,
  };
}

/**
 * Valide les données spécifiques au rôle AMO
 */
async function validateAmoData(role: string, entrepriseAmoId?: string): Promise<void> {
  if (role === UserRole.AMO) {
    if (!entrepriseAmoId) {
      throw new Error("Une entreprise AMO doit être sélectionnée pour un agent avec le rôle AMO");
    }

    // Vérifier que l'entreprise AMO existe
    const entrepriseExists = await entreprisesAmoRepo.exists(entrepriseAmoId);
    if (!entrepriseExists) {
      throw new Error("L'entreprise AMO sélectionnée n'existe pas");
    }
  }
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

  // Valider les données AMO si le rôle est AMO
  await validateAmoData(data.role, data.entrepriseAmoId);

  // Déterminer l'entrepriseAmoId (null si le rôle n'est pas AMO)
  const entrepriseAmoId = data.role === UserRole.AMO ? data.entrepriseAmoId : null;

  // Créer l'agent (sans sub pour l'instant, sera mis à jour lors de la première connexion ProConnect)
  const agent = await agentsRepository.create({
    sub: `pending_${Date.now()}_${Math.random().toString(36).substring(7)}`, // Sub temporaire
    email: data.email,
    givenName: data.givenName,
    usualName: data.usualName,
    role: data.role,
    entrepriseAmoId: entrepriseAmoId ?? null,
  });

  // Ajouter les permissions si spécifiées
  let departements: string[] = [];
  if (data.departements && data.departements.length > 0) {
    await agentPermissionsRepository.addDepartements(agent.id, data.departements);
    departements = data.departements;
  }

  // Récupérer les infos de l'entreprise AMO si présente
  let entrepriseAmo = null;
  if (entrepriseAmoId) {
    const amo = await entreprisesAmoRepo.findById(entrepriseAmoId);
    if (amo) {
      entrepriseAmo = {
        id: amo.id,
        nom: amo.nom,
        siret: amo.siret,
      };
    }
  }

  return {
    agent: {
      ...agent,
      entrepriseAmoId: agent.entrepriseAmoId,
    },
    departements,
    entrepriseAmo,
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

  // Déterminer le rôle effectif (nouveau ou existant)
  const effectiveRole = data.role ?? existingAgent.role;

  // Valider les données AMO si le rôle est AMO
  // Si on change vers AMO, entrepriseAmoId doit être fourni
  // Si on change depuis AMO vers autre chose, on met à null
  let entrepriseAmoId: string | null = existingAgent.entrepriseAmoId;

  if (effectiveRole === UserRole.AMO) {
    // Si on passe en AMO ou si on est déjà AMO
    if (data.entrepriseAmoId !== undefined) {
      // Une nouvelle valeur est fournie
      await validateAmoData(effectiveRole, data.entrepriseAmoId ?? undefined);
      entrepriseAmoId = data.entrepriseAmoId;
    } else if (!existingAgent.entrepriseAmoId) {
      // On passe en AMO mais pas d'entreprise fournie et pas d'entreprise existante
      throw new Error("Une entreprise AMO doit être sélectionnée pour un agent avec le rôle AMO");
    }
    // Sinon on garde l'entreprise existante
  } else {
    // Le rôle n'est pas AMO, on met l'entreprise à null
    entrepriseAmoId = null;
  }

  // Mettre à jour l'agent
  const updateData: Partial<Agent> = {};
  if (data.email) updateData.email = data.email;
  if (data.givenName) updateData.givenName = data.givenName;
  if (data.usualName !== undefined) updateData.usualName = data.usualName;
  if (data.role) updateData.role = data.role;

  // Toujours mettre à jour l'entrepriseAmoId (peut passer de valeur à null)
  updateData.entrepriseAmoId = entrepriseAmoId;

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

  // Récupérer les infos de l'entreprise AMO si présente
  let entrepriseAmo = null;
  if (entrepriseAmoId) {
    const amo = await entreprisesAmoRepo.findById(entrepriseAmoId);
    if (amo) {
      entrepriseAmo = {
        id: amo.id,
        nom: amo.nom,
        siret: amo.siret,
      };
    }
  }

  return {
    agent: {
      ...updatedAgent,
      entrepriseAmoId: updatedAgent.entrepriseAmoId,
    },
    departements,
    entrepriseAmo,
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
