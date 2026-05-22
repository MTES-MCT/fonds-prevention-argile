import { agentsRepo } from "@/shared/database/repositories";

export interface ParcoursCreatorInfo {
  displayName: string;
  structureNom: string | null;
  structureType: "amo" | "allers_vers" | null;
}

/**
 * Résout l'agent à l'origine d'un dossier av-add-dossier (champ
 * `parcours_prevention.created_by_agent_id`).
 *
 * Retourne `null` si :
 * - le parcours n'a pas été créé par un agent (auto-création par le demandeur),
 * - l'agent a été supprimé depuis,
 * - aucun id n'est fourni.
 */
export async function getParcoursCreator(
  agentId: string | null | undefined
): Promise<ParcoursCreatorInfo | null> {
  if (!agentId) return null;

  const agent = await agentsRepo.findByIdWithStructure(agentId);
  if (!agent) return null;

  const displayName = [agent.givenName, agent.usualName].filter(Boolean).join(" ").trim();

  if (agent.entrepriseAmo) {
    return { displayName, structureNom: agent.entrepriseAmo.nom, structureType: "amo" };
  }
  if (agent.allersVers) {
    return { displayName, structureNom: agent.allersVers.nom, structureType: "allers_vers" };
  }
  return { displayName, structureNom: null, structureType: null };
}
