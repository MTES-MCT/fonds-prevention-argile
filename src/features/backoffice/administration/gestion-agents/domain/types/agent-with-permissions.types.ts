import { AGENT_ROLES } from "@/shared/domain/value-objects/agent-role.enum";

/**
 * Informations de l'entreprise AMO liée à un agent
 */
export interface AgentEntrepriseAmoInfo {
  id: string;
  nom: string;
  siret: string;
}

/**
 * Informations du territoire Allers-Vers lié à un agent
 */
export interface AgentAllersVersInfo {
  id: string;
  nom: string;
}

/**
 * Agent avec ses permissions (départements), son entreprise AMO et son territoire Allers-Vers
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
    entrepriseAmoId: string | null;
    allersVersId: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  departements: string[];
  entrepriseAmo: AgentEntrepriseAmoInfo | null;
  allersVers: AgentAllersVersInfo | null;
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
  entrepriseAmoId?: string;
  allersVersId?: string;
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
  entrepriseAmoId?: string | null;
  allersVersId?: string | null;
}
