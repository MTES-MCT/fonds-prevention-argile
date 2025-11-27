import type { Agent } from "@/shared/database/schema/agents";

/**
 * Agent avec ses permissions (départements)
 */
export interface AgentWithPermissions {
  agent: Agent;
  departements: string[];
}

/**
 * Données pour créer un agent
 */
export interface CreateAgentData {
  email: string;
  givenName: string;
  usualName?: string;
  role: string;
  departements?: string[];
}

/**
 * Données pour mettre à jour un agent
 */
export interface UpdateAgentData {
  email?: string;
  givenName?: string;
  usualName?: string;
  role?: string;
  departements?: string[];
}
