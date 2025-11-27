import { DEFAULT_REDIRECTS, ROUTES } from "../domain/value-objects/configs/routes.config";
import type { UserRole } from "../domain/types";
import { UserRole as UserRoleEnum } from "@/shared/domain/value-objects/user-role.enum";

/**
 * Service de gestion des redirections
 */

/**
 * Obtient la redirection par défaut pour un rôle
 */
export function getDefaultRedirect(role: UserRole): string {
  switch (role) {
    case UserRoleEnum.ADMINISTRATEUR:
      return DEFAULT_REDIRECTS.administrateur;
    case UserRoleEnum.AMO:
      return DEFAULT_REDIRECTS.amo;
    case UserRoleEnum.INSTRUCTEUR:
      return DEFAULT_REDIRECTS.instructeur;
    case UserRoleEnum.PARTICULIER:
      return DEFAULT_REDIRECTS.particulier;
    default:
      return DEFAULT_REDIRECTS.home;
  }
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
  // Si l'utilisateur voulait accéder à une page spécifique (non vide et différente de /)
  if (intendedPath && intendedPath !== ROUTES.home) {
    return intendedPath;
  }

  // Sinon, redirection par défaut selon le rôle
  return getDefaultRedirect(role);
}

/**
 * Obtient la page de connexion appropriée selon le contexte
 */
export function getLoginRedirect(isAgent: boolean = false): string {
  return isAgent ? DEFAULT_REDIRECTS.loginAgent : DEFAULT_REDIRECTS.login;
}
