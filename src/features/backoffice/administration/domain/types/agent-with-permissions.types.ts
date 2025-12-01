import { AGENT_ROLES } from "@/shared/domain/value-objects/agent-role.enum";

/**
 * Agent avec ses permissions (départements)
 */
export interface AgentWithPermissions {
  agent: {
    id: string;
    sub: string;
    email: string;
    givenName: string;
    usualName: string | null;
    uid: string | null;
    siret: string | null;
    phone: string | null;
    organizationalUnit: string | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  };
  departements: string[];
}

/**
 * Données pour créer un agent
 */
export interface CreateAgentData {
  email: string;
  givenName: string;
  usualName?: string;
  role: AGENT_ROLES;
  departements?: string[];
}

/**
 * Données pour mettre à jour un agent
 */
export interface UpdateAgentData {
  email?: string;
  givenName?: string;
  usualName?: string;
  role?: AGENT_ROLES;
  departements?: string[];
}
