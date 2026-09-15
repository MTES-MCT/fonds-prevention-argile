import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import type { AgentEditInfo } from "@/features/backoffice/espace-agent/demandes/domain/types/demande-detail.types";
import { agentsRepository } from "@/shared/database/repositories/agents.repository";
import {
  SIMULATION_FIELDS_BY_KEY,
  diffSimulationFields,
} from "@/features/simulateur/domain/value-objects/simulation-fields";

/**
 * Construit les informations de diff agent pour un parcours donné.
 *
 * @param parcours - Objet avec les champs RGA du parcours_prevention
 * @returns AgentEditInfo si des données agent existent, null sinon
 */
export async function buildAgentEditInfo(parcours: {
  rgaSimulationData: RGASimulationData | null;
  rgaSimulationDataAgent: RGASimulationData | null;
  rgaSimulationDataAgentBaseline?: RGASimulationData | null;
  rgaSimulationAgentEditedAt: Date | null;
  rgaSimulationAgentEditedBy: string | null;
}): Promise<AgentEditInfo | null> {
  // Pas de données agent → pas de diff
  if (!parcours.rgaSimulationDataAgent || !parcours.rgaSimulationAgentEditedAt) {
    return null;
  }

  // Baseline = snapshot d'origine (posé à la 1re correction) si présent, sinon la
  // simulation demandeur. Le snapshot couvre les dossiers créés par agent, où le
  // slot demandeur (`rgaSimulationData`) est vide et où l'ancien diff renvoyait null.
  const initial = parcours.rgaSimulationDataAgentBaseline ?? parcours.rgaSimulationData;
  const edited = parcours.rgaSimulationDataAgent;

  // Si pas de baseline exploitable, on ne peut pas faire de diff
  if (!initial) {
    return null;
  }

  // Résoudre le nom de l'agent
  let agentPrenom = "";
  let agentNom = "Agent";
  if (parcours.rgaSimulationAgentEditedBy) {
    const agent = await agentsRepository.findById(parcours.rgaSimulationAgentEditedBy);
    if (agent) {
      agentPrenom = agent.givenName || "";
      agentNom = agent.usualName || "";
    }
  }

  // Valeur AVANT correction, pour les seuls champs modifiés (cf. `SIMULATION_FIELDS`).
  const originalDisplayValues: Record<string, string> = {};

  for (const key of diffSimulationFields(initial, edited)) {
    const field = SIMULATION_FIELDS_BY_KEY[key];
    originalDisplayValues[key] = field.formatValue(field.getValue(initial));
  }

  const nombreModifications = Object.keys(originalDisplayValues).length;

  // S'il n'y a aucune modification détectée, ne pas afficher le bandeau
  if (nombreModifications === 0) {
    return null;
  }

  return {
    agentPrenom,
    agentNom,
    editedAt: parcours.rgaSimulationAgentEditedAt,
    nombreModifications,
    originalDisplayValues,
  };
}
