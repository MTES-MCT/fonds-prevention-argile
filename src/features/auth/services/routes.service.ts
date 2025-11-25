import { PROTECTED_ROUTES, ROLES } from "../domain/value-objects";
import type { UserRole } from "../domain/types";
import { isAgentRole } from "@/shared/domain/value-objects";

/**
 * Service de protection des routes
 */

/**
 * Vérifie si une route nécessite une authentification admin/agent
 */
export function isAdminRoute(path: string): boolean {
  return PROTECTED_ROUTES.admin.some((route) => path.startsWith(route));
}

/**
 * Vérifie si une route nécessite une authentification particulier
 */
export function isParticulierRoute(path: string): boolean {
  return PROTECTED_ROUTES.particulier.some((route) => path.startsWith(route));
}

/**
 * Vérifie si une route est protégée
 */
export function isProtectedRoute(path: string): boolean {
  return isAdminRoute(path) || isParticulierRoute(path);
}

/**
 * Vérifie si un utilisateur peut accéder à une route
 */
export function canAccessRoute(path: string, role?: UserRole): boolean {
  if (!role) return false;

  // Routes admin accessibles par tous les agents (ADMIN, INSTRUCTEUR, AMO)
  if (isAdminRoute(path)) {
    return isAgentRole(role);
  }

  // Routes particulier accessibles uniquement par PARTICULIER
  if (isParticulierRoute(path)) {
    return role === ROLES.PARTICULIER;
  }

  return true; // Routes publiques
}
