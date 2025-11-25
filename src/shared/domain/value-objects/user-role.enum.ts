/**
 * Rôles utilisateurs disponibles dans l'application
 */
export enum UserRole {
  // Particuliers (FranceConnect)
  PARTICULIER = "particulier",

  // Agents (ProConnect)
  ADMIN = "admin",
  INSTRUCTEUR = "instructeur",
  AMO = "amo",
}

/**
 * Rôles agents uniquement (accès administration)
 */
export const AGENT_ROLES = [UserRole.ADMIN, UserRole.INSTRUCTEUR, UserRole.AMO] as const;

export type AgentRole = (typeof AGENT_ROLES)[number];

/**
 * Vérifie si un rôle est un rôle agent
 */
export function isAgentRole(role: UserRole | string): role is AgentRole {
  return AGENT_ROLES.includes(role as AgentRole);
}

/**
 * Vérifie si une valeur est un rôle valide
 */
export function isValidRole(value: unknown): value is UserRole {
  return typeof value === "string" && Object.values(UserRole).includes(value as UserRole);
}
