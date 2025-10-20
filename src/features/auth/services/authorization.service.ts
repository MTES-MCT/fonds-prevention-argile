import { DEFAULT_REDIRECTS, PROTECTED_ROUTES } from "../config";
import { ROLES } from "../core/auth.constants";
import type { UserRole } from "../core/auth.types";

/**
 * Vérifie si une route nécessite une authentification admin
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

  if (isAdminRoute(path)) return role === ROLES.ADMIN;
  if (isParticulierRoute(path)) return role === ROLES.PARTICULIER;

  return true; // Routes publiques
}

/**
 * Obtient la redirection par défaut pour un rôle
 */
export function getDefaultRedirect(role: UserRole): string {
  return role === ROLES.ADMIN
    ? DEFAULT_REDIRECTS.admin
    : DEFAULT_REDIRECTS.particulier;
}

/**
 * Obtient la redirection en cas d'accès non autorisé
 */
export function getUnauthorizedRedirect(role?: UserRole): string {
  if (!role) return DEFAULT_REDIRECTS.login;

  // Rediriger vers l'espace approprié selon le rôle
  return getDefaultRedirect(role);
}
