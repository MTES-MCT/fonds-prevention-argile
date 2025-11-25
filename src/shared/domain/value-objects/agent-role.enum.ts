import { UserRole } from "./user-role.enum";

/**
 * Valeurs des rôles agents pour Drizzle pgEnum
 * Note: Drizzle nécessite un objet constant, pas un enum TypeScript
 */
export const AGENT_ROLES = {
  ADMIN: UserRole.ADMIN,
  INSTRUCTEUR: UserRole.INSTRUCTEUR,
  AMO: UserRole.AMO,
} as const;

export type AGENT_ROLES = (typeof AGENT_ROLES)[keyof typeof AGENT_ROLES];
