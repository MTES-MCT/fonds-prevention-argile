import { ROLES } from "../value-objects/constants";

/**
 * Type dérivé des rôles disponibles
 */
export type UserRole = (typeof ROLES)[keyof typeof ROLES];
