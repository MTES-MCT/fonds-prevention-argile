import { parcoursActionsRepo, agentsRepo } from "@/shared/database/repositories";
import type { Agent } from "@/shared/database/schema/agents";
import { buildAuthorSnapshot } from "./author-snapshot";

/**
 * Auteur d'une action système : un agent (objet déjà chargé ou simple id, résolu ici)
 * ou le demandeur lui-même (`agentId` null côté base).
 */
export type SystemActionAuthor = { agent: Agent } | { agentId: string } | { demandeur: { nom: string } };

interface LogSystemActionParams {
  parcoursId: string;
  author: SystemActionAuthor;
  actionType: string;
  message?: string | null;
}

/**
 * Trace un évènement métier dans l'historique du dossier (`parcours_actions`).
 *
 * Best-effort : l'audit ne doit jamais invalider la mutation déjà enregistrée, donc
 * cette fonction n'échoue pas (erreur loggée, `false` retourné).
 */
export async function logSystemAction({
  parcoursId,
  author,
  actionType,
  message,
}: LogSystemActionParams): Promise<boolean> {
  try {
    let agentId: string | null = null;
    let snapshot;

    if ("demandeur" in author) {
      snapshot = {
        authorName: author.demandeur.nom.trim() || "Le demandeur",
        authorStructure: null,
        authorStructureType: "DEMANDEUR" as const,
      };
    } else {
      const agent = "agent" in author ? author.agent : await agentsRepo.findById(author.agentId);
      if (!agent) {
        console.error(`[logSystemAction] agent introuvable (${actionType}, parcours ${parcoursId})`);
        return false;
      }
      agentId = agent.id;
      snapshot = await buildAuthorSnapshot(agent);
    }

    await parcoursActionsRepo.create({
      parcoursId,
      agentId,
      actionType,
      message: message || null,
      authorName: snapshot.authorName,
      authorStructure: snapshot.authorStructure,
      authorStructureType: snapshot.authorStructureType,
    });

    return true;
  } catch (error) {
    console.error(`[logSystemAction] audit best-effort échoué (${actionType}):`, error);
    return false;
  }
}
