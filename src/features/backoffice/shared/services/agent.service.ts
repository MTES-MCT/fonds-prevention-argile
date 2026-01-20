import { agentsRepository } from "@/shared/database/repositories/agents.repository";
import type { Agent } from "@/shared/database/schema/agents";

/**
 * Récupère un agent par son ID
 */
export async function getAgentById(id: string): Promise<Agent | null> {
  return agentsRepository.findById(id);
}

/**
 * Récupère un agent par son email
 */
export async function getAgentByEmail(email: string): Promise<Agent | null> {
  return agentsRepository.findByEmail(email);
}

/**
 * Récupère un agent par son sub ProConnect
 */
export async function getAgentBySub(sub: string): Promise<Agent | null> {
  return agentsRepository.findBySub(sub);
}
