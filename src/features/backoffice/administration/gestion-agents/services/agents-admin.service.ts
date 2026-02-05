import { agentsRepository } from "@/shared/database/repositories/agents.repository";
import type { Agent } from "@/shared/database/schema/agents";
import { DEPARTEMENTS } from "@/shared/constants/departements.constants";
import { agentPermissionsRepository, entreprisesAmoRepo, allersVersRepository } from "@/shared/database";
import { UserRole } from "@/shared/domain/value-objects";
import { AgentWithPermissions, CreateAgentData, UpdateAgentData } from "../domain/types/agent-with-permissions.types";

/**
 * Récupère tous les agents avec leurs permissions, entreprise AMO et territoire Allers-Vers
 */
export async function getAllAgentsWithPermissions(): Promise<AgentWithPermissions[]> {
  const agentsWithAmo = await agentsRepository.findAllWithEntrepriseAmo();

  const agentsWithPermissions: AgentWithPermissions[] = await Promise.all(
    agentsWithAmo.map(async (agentWithAmo) => {
      const departements = await agentPermissionsRepository.getDepartementsByAgentId(agentWithAmo.id);

      // Récupérer les infos du territoire Allers-Vers si présent
      let allersVers = null;
      if (agentWithAmo.allersVersId) {
        const av = await allersVersRepository.findById(agentWithAmo.allersVersId);
        if (av) {
          allersVers = {
            id: av.id,
            nom: av.nom,
          };
        }
      }

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
          allersVersId: agentWithAmo.allersVersId,
          createdAt: agentWithAmo.createdAt,
          updatedAt: agentWithAmo.updatedAt,
        },
        departements,
        entrepriseAmo: agentWithAmo.entrepriseAmo,
        allersVers,
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

  // Récupérer les infos du territoire Allers-Vers si présent
  let allersVers = null;
  if (agentWithAmo.allersVersId) {
    const av = await allersVersRepository.findById(agentWithAmo.allersVersId);
    if (av) {
      allersVers = {
        id: av.id,
        nom: av.nom,
      };
    }
  }

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
      allersVersId: agentWithAmo.allersVersId,
      createdAt: agentWithAmo.createdAt,
      updatedAt: agentWithAmo.updatedAt,
    },
    departements,
    entrepriseAmo: agentWithAmo.entrepriseAmo,
    allersVers,
  };
}

/**
 * Valide les données spécifiques aux rôles AMO et Allers-Vers
 */
async function validateRoleSpecificData(
  role: string,
  entrepriseAmoId?: string,
  allersVersId?: string
): Promise<void> {
  // Validation AMO pour les rôles AMO et AMO_ET_ALLERS_VERS
  if ([UserRole.AMO, UserRole.AMO_ET_ALLERS_VERS].includes(role as UserRole)) {
    if (!entrepriseAmoId) {
      throw new Error("Une entreprise AMO doit être sélectionnée pour ce rôle");
    }

    // Vérifier que l'entreprise AMO existe
    const entrepriseExists = await entreprisesAmoRepo.exists(entrepriseAmoId);
    if (!entrepriseExists) {
      throw new Error("L'entreprise AMO sélectionnée n'existe pas");
    }
  }

  // Validation Allers-Vers pour les rôles ALLERS_VERS et AMO_ET_ALLERS_VERS
  if ([UserRole.ALLERS_VERS, UserRole.AMO_ET_ALLERS_VERS].includes(role as UserRole)) {
    if (!allersVersId) {
      throw new Error("Un territoire Allers-Vers doit être sélectionné pour ce rôle");
    }

    // Vérifier que le territoire Allers-Vers existe
    const allersVersExists = await allersVersRepository.findById(allersVersId);
    if (!allersVersExists) {
      throw new Error("Le territoire Allers-Vers sélectionné n'existe pas");
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

  // Valider les données spécifiques au rôle (AMO et/ou Allers-Vers)
  await validateRoleSpecificData(data.role, data.entrepriseAmoId, data.allersVersId);

  // Déterminer l'entrepriseAmoId (null si le rôle ne nécessite pas d'AMO)
  const entrepriseAmoId = [UserRole.AMO, UserRole.AMO_ET_ALLERS_VERS].includes(data.role as UserRole)
    ? data.entrepriseAmoId
    : null;

  // Déterminer l'allersVersId (null si le rôle ne nécessite pas d'Allers-Vers)
  const allersVersId = [UserRole.ALLERS_VERS, UserRole.AMO_ET_ALLERS_VERS].includes(data.role as UserRole)
    ? data.allersVersId
    : null;

  // Créer l'agent (sans sub pour l'instant, sera mis à jour lors de la première connexion ProConnect)
  const agent = await agentsRepository.create({
    sub: `pending_${Date.now()}_${Math.random().toString(36).substring(7)}`, // Sub temporaire
    email: data.email,
    givenName: data.givenName,
    usualName: data.usualName,
    role: data.role,
    entrepriseAmoId: entrepriseAmoId ?? null,
    allersVersId: allersVersId ?? null,
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

  // Récupérer les infos du territoire Allers-Vers si présent
  let allersVers = null;
  if (allersVersId) {
    const av = await allersVersRepository.findById(allersVersId);
    if (av) {
      allersVers = {
        id: av.id,
        nom: av.nom,
      };
    }
  }

  return {
    agent: {
      ...agent,
      entrepriseAmoId: agent.entrepriseAmoId,
      allersVersId: agent.allersVersId,
    },
    departements,
    entrepriseAmo,
    allersVers,
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

  // Gestion de l'entrepriseAmoId selon le rôle
  let entrepriseAmoId: string | null = existingAgent.entrepriseAmoId;

  if ([UserRole.AMO, UserRole.AMO_ET_ALLERS_VERS].includes(effectiveRole as UserRole)) {
    // Le rôle nécessite une entreprise AMO
    if (data.entrepriseAmoId !== undefined) {
      // Une nouvelle valeur est fournie
      entrepriseAmoId = data.entrepriseAmoId;
    }
    // Valider que l'entreprise AMO est présente
    if (!entrepriseAmoId) {
      throw new Error("Une entreprise AMO doit être sélectionnée pour ce rôle");
    }
    // Vérifier que l'entreprise existe
    const entrepriseExists = await entreprisesAmoRepo.exists(entrepriseAmoId);
    if (!entrepriseExists) {
      throw new Error("L'entreprise AMO sélectionnée n'existe pas");
    }
  } else {
    // Le rôle ne nécessite pas d'AMO, on met l'entreprise à null
    entrepriseAmoId = null;
  }

  // Gestion de l'allersVersId selon le rôle
  let allersVersId: string | null = existingAgent.allersVersId;

  if ([UserRole.ALLERS_VERS, UserRole.AMO_ET_ALLERS_VERS].includes(effectiveRole as UserRole)) {
    // Le rôle nécessite un territoire Allers-Vers
    if (data.allersVersId !== undefined) {
      // Une nouvelle valeur est fournie
      allersVersId = data.allersVersId;
    }
    // Valider que le territoire Allers-Vers est présent
    if (!allersVersId) {
      throw new Error("Un territoire Allers-Vers doit être sélectionné pour ce rôle");
    }
    // Vérifier que le territoire existe
    const allersVersExists = await allersVersRepository.findById(allersVersId);
    if (!allersVersExists) {
      throw new Error("Le territoire Allers-Vers sélectionné n'existe pas");
    }
  } else {
    // Le rôle ne nécessite pas d'Allers-Vers, on met le territoire à null
    allersVersId = null;
  }

  // Mettre à jour l'agent
  const updateData: Partial<Agent> = {};
  if (data.email) updateData.email = data.email;
  if (data.givenName) updateData.givenName = data.givenName;
  if (data.usualName !== undefined) updateData.usualName = data.usualName;
  if (data.role) updateData.role = data.role;

  // Toujours mettre à jour l'entrepriseAmoId et l'allersVersId (peuvent passer de valeur à null)
  updateData.entrepriseAmoId = entrepriseAmoId;
  updateData.allersVersId = allersVersId;

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

  // Récupérer les infos du territoire Allers-Vers si présent
  let allersVers = null;
  if (allersVersId) {
    const av = await allersVersRepository.findById(allersVersId);
    if (av) {
      allersVers = {
        id: av.id,
        nom: av.nom,
      };
    }
  }

  return {
    agent: {
      ...updatedAgent,
      entrepriseAmoId: updatedAgent.entrepriseAmoId,
      allersVersId: updatedAgent.allersVersId,
    },
    departements,
    entrepriseAmo,
    allersVers,
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
