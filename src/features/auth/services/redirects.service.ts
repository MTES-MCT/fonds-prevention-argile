import { DEFAULT_REDIRECTS, ROLES } from "../domain/value-objects";
import type { UserRole } from "../domain/types";

/**
 * Service de gestion des redirections
 */

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

  return getDefaultRedirect(role);
}

/**
 * Obtient la redirection après login selon le rôle
 */
export function getPostLoginRedirect(
  role: UserRole,
  intendedPath?: string
): string {
  // Si l'utilisateur voulait accéder à une page spécifique
  if (intendedPath && intendedPath !== "/") {
    return intendedPath;
  }

  // Sinon, redirection par défaut selon le rôle
  return getDefaultRedirect(role);
}
