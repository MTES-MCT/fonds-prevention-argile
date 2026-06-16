/**
 * Rôles utilisateurs disponibles dans l'application
 */
export enum UserRole {
  // Particuliers (FranceConnect)
  PARTICULIER = "particulier",

  // Agents (ProConnect)
  ADMINISTRATEUR = "administrateur",
  SUPER_ADMINISTRATEUR = "super_administrateur",
  AMO = "amo",
  ANALYSTE = "analyste",
  ALLERS_VERS = "allers_vers",
  AMO_ET_ALLERS_VERS = "amo_et_allers_vers",
}

/**
 * Rôles administrateurs (accès /administration)
 */
export const ADMIN_ROLES = [UserRole.SUPER_ADMINISTRATEUR, UserRole.ADMINISTRATEUR] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

/**
 * Rôles agents uniquement
 */
export const AGENT_ROLES = [
  UserRole.ADMINISTRATEUR,
  UserRole.SUPER_ADMINISTRATEUR,
  UserRole.AMO,
  UserRole.ANALYSTE,
  UserRole.ALLERS_VERS,
  UserRole.AMO_ET_ALLERS_VERS,
] as const;

export type AgentRole = (typeof AGENT_ROLES)[number];

/**
 * Vérifie si un rôle est un rôle agent
 */
export function isAgentRole(role: UserRole | string): role is AgentRole {
  return AGENT_ROLES.includes(role as AgentRole);
}

/**
 * Vérifie si un rôle est un rôle administrateur
 */
export function isAdminRole(role: UserRole | string): role is AdminRole {
  return ADMIN_ROLES.includes(role as AdminRole);
}

/**
 * Vérifie si une valeur est un rôle valide
 */
export function isValidRole(value: unknown): value is UserRole {
  return typeof value === "string" && Object.values(UserRole).includes(value as UserRole);
}

/**
 *  Vérifie si un rôle est un super administrateur
 */
export function isSuperAdminRole(role: UserRole | string): boolean {
  return role === UserRole.SUPER_ADMINISTRATEUR;
}
