import { allersVersRepository, entreprisesAmoRepo } from "@/shared/database/repositories";
import type { Agent } from "@/shared/database/schema/agents";
import type { StructureType } from "../domain/types/action.types";

/**
 * Snapshot dénormalisé de l'auteur d'une action (`parcours_actions`), conservé même
 * si l'agent est supprimé. Source unique réutilisée par chaque écriture d'action.
 */
export interface AuthorSnapshot {
  authorName: string;
  authorStructure: string | null;
  authorStructureType: StructureType | null;
}

/**
 * Construit le snapshot auteur à partir de l'agent : nom affiché + structure
 * (entreprise AMO, Aller-vers, ou administration).
 */
export async function buildAuthorSnapshot(agent: Agent): Promise<AuthorSnapshot> {
  const authorName = agent.usualName ? `${agent.givenName} ${agent.usualName}` : agent.givenName;

  if (agent.entrepriseAmoId) {
    const entreprise = await entreprisesAmoRepo.findById(agent.entrepriseAmoId);
    return { authorName, authorStructure: entreprise?.nom ?? null, authorStructureType: "AMO" };
  }
  if (agent.allersVersId) {
    const av = await allersVersRepository.findById(agent.allersVersId);
    return { authorName, authorStructure: av?.nom ?? null, authorStructureType: "ALLERS_VERS" };
  }
  return { authorName, authorStructure: null, authorStructureType: "ADMINISTRATION" };
}
