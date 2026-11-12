import { UserRole, type AgentRole } from "./user-role.enum";

/** Rôles portés par l'agent lui-même : ils ne viennent d'aucune structure. */
export const ROLES_PLATEFORME = [UserRole.SUPER_ADMINISTRATEUR, UserRole.ADMINISTRATEUR, UserRole.ANALYSTE] as const;

export type RolePlateforme = (typeof ROLES_PLATEFORME)[number];

export function isRolePlateforme(role: string): role is RolePlateforme {
  return ROLES_PLATEFORME.includes(role as RolePlateforme);
}

/** Rattachement d'un agent : un rôle plateforme, ou une structure dont il hérite les rôles. */
export type CompteAgent = { type: "plateforme"; role: RolePlateforme } | { type: "structure"; structureId: string };

/** Habilitations d'une structure : la présence de sa ligne AMO et de sa ligne Aller-vers. */
export interface HabilitationsStructure {
  amo: boolean;
  allersVers: boolean;
}

/** Rôle conféré par une structure, null si elle n'a plus aucune habilitation. */
export function roleDepuisStructure({ amo, allersVers }: HabilitationsStructure): AgentRole | null {
  if (amo && allersVers) return UserRole.AMO_ET_ALLERS_VERS;
  if (amo) return UserRole.AMO;
  if (allersVers) return UserRole.ALLERS_VERS;
  return null;
}

/**
 * Rôle effectif d'un agent : celui de sa structure s'il en a une, sinon son rôle plateforme.
 * Un rôle de structure stocké sans structure (compte orphelin) ne confère plus rien.
 */
export function resoudreRoleAgent(agent: {
  structureId: string | null;
  roleStocke: string;
  habilitations: HabilitationsStructure;
}): AgentRole | null {
  if (agent.structureId) return roleDepuisStructure(agent.habilitations);
  return isRolePlateforme(agent.roleStocke) ? agent.roleStocke : null;
}
