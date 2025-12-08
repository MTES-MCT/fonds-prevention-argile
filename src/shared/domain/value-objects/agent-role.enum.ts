import { UserRole } from "./user-role.enum";

/**
 * Valeurs des rôles agents pour Drizzle pgEnum
 * Note: Drizzle nécessite un objet constant, pas un enum TypeScript
 */
export const AGENT_ROLES = {
  ADMINISTRATEUR: UserRole.ADMINISTRATEUR,
  SUPER_ADMINISTRATEUR: UserRole.SUPER_ADMINISTRATEUR,
  AMO: UserRole.AMO,
  ANALYSTE: UserRole.ANALYSTE,
} as const;

export type AGENT_ROLES = (typeof AGENT_ROLES)[keyof typeof AGENT_ROLES];
