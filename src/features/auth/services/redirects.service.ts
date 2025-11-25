import { DEFAULT_REDIRECTS, ROLES } from "../domain/value-objects";
import type { UserRole } from "../domain/types";
import { isAgentRole } from "@/shared/domain/value-objects";

/**
 * Service de gestion des redirections
 */

/**
 * Obtient la redirection par défaut pour un rôle
 */
export function getDefaultRedirect(role: UserRole): string {
  if (isAgentRole(role)) {
    return DEFAULT_REDIRECTS.admin;
  }

  if (role === ROLES.PARTICULIER) {
    return DEFAULT_REDIRECTS.particulier;
  }

  return DEFAULT_REDIRECTS.home;
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
export function getPostLoginRedirect(role: UserRole, intendedPath?: string): string {
  // Si l'utilisateur voulait accéder à une page spécifique
  if (intendedPath && intendedPath !== "/") {
    return intendedPath;
  }

  // Sinon, redirection par défaut selon le rôle
  return getDefaultRedirect(role);
}
