import type { RGASimulationData } from "../types/rga-simulation.types";

/**
 * Sous-ensemble minimal d'un parcours nécessaire pour résoudre la simulation
 * effective.
 */
export interface ParcoursSimulationPair {
  rgaSimulationData: RGASimulationData | null;
  rgaSimulationDataAgent: RGASimulationData | null;
}

/**
 * Convention par défaut : USER-FIRST.
 *
 * Si le demandeur a fait sa propre simulation, elle est plus récente
 * (post-création par agent) et reflète son auto-déclaration. La simulation
 * agent (`rgaSimulationDataAgent`) sert de fallback pour les dossiers créés
 * via av-add-dossier tant que le demandeur n'a pas encore simulé.
 *
 */
export function getDemandeurFirstSimulation(p: ParcoursSimulationPair): RGASimulationData | null {
  return p.rgaSimulationData ?? p.rgaSimulationDataAgent;
}

/**
 * Variante AGENT-FIRST pour les stats de référence où la fiabilité BAN-strict
 * de l'agent prime sur l'auto-déclaration du demandeur (commune, département,
 * EPCI utilisés pour des comptages géographiques).
 *
 */
export function getAgentFirstSimulation(p: ParcoursSimulationPair): RGASimulationData | null {
  return p.rgaSimulationDataAgent ?? p.rgaSimulationData;
}

/**
 * `true` dès qu'au moins une des deux simulations existe.
 */
export function hasAnySimulation(p: ParcoursSimulationPair): boolean {
  return p.rgaSimulationData != null || p.rgaSimulationDataAgent != null;
}

/**
 * Sucre : extrait directement `logement` en convention user-first.
 */
export function getDemandeurFirstLogement(p: ParcoursSimulationPair): RGASimulationData["logement"] | null {
  return getDemandeurFirstSimulation(p)?.logement ?? null;
}
