import { PROTECTED_ROUTES, ROLES, ROUTES } from "../domain/value-objects";
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

/**
 * Vérifie si un chemin correspond à une route du backoffice
 * (alias plus explicite de isAdminRoute pour le code métier)
 */
export function isBackofficeRoute(path: string): boolean {
  return path.startsWith(ROUTES.backoffice.administration.root) || path.startsWith(ROUTES.backoffice.espaceAmo.root);
}

/**
 * Vérifie si un chemin est une route API
 */
export function isApiRoute(path: string): boolean {
  return path.startsWith("/api/");
}
