import type { CompteAgent } from "@/shared/domain/value-objects/role-structure";

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
 * Structure de rattachement d'un agent
 */
export interface AgentStructureInfo {
  id: string;
  nom: string;
}

/**
 * Agent avec ses permissions (départements), sa structure et les habilitations qu'il en hérite
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
    // Null : structure sans habilitation, ou rôle de structure sans structure. Aucun accès.
    role: string | null;
    structureId: string | null;
    entrepriseAmoId: string | null;
    allersVersId: string | null;
    // null = agent actif. `desactivePar` reste en base pour l'audit, l'UI n'en a pas besoin.
    desactiveAt: Date | null;
    desactiveRaison: string | null;
    lastLogin: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  departements: string[];
  structure: AgentStructureInfo | null;
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
  compte: CompteAgent;
  departements?: string[];
}

/**
 * Données pour mettre à jour un agent
 */
export interface UpdateAgentData {
  email?: string;
  givenName?: string;
  usualName?: string;
  compte?: CompteAgent;
  departements?: string[];
}
