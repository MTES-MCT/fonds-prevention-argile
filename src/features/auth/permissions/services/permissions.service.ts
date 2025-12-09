import { getCurrentUser } from "@/features/auth/services/user.service";
import { AUTH_METHODS } from "@/features/auth/domain/value-objects/constants";
import { isAdminRole, isAgentRole, UserRole } from "@/shared/domain/value-objects";
import type { AuthUser } from "@/features/auth/domain/entities";
import type { ActionResult } from "@/shared/types";
import type { AccessCheckResult, AccessCheckOptions } from "../domain/types";
import { AccessErrorCode } from "../domain";

/**
 * Service centralisé de gestion des permissions
 *
 * Fournit toutes les fonctions de vérification d'accès pour :
 * - Authentification utilisateur
 * - Vérification de rôles
 * - Vérification d'accès à des routes
 * - Vérification de permissions spécifiques (future avec agent_permissions)
 */

/**
 * Vérifie qu'un utilisateur est authentifié
 *
 * @returns Résultat avec l'utilisateur si authentifié
 */
export async function checkUserAccess(): Promise<AccessCheckResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      hasAccess: false,
      reason: "Utilisateur non authentifié",
      errorCode: AccessErrorCode.NOT_AUTHENTICATED,
    };
  }

  return {
    hasAccess: true,
    user,
  };
}

/**
 * Vérifie qu'un utilisateur a le rôle requis
 *
 * @param requiredRoles - Rôles autorisés (au moins un doit correspondre)
 * @returns Résultat avec l'utilisateur si autorisé
 */
export async function checkRoleAccess(requiredRoles: UserRole[]): Promise<AccessCheckResult> {
  const userCheck = await checkUserAccess();
  if (!userCheck.hasAccess || !userCheck.user) {
    return userCheck;
  }

  const user = userCheck.user;
  const hasRole = requiredRoles.includes(user.role as UserRole);

  if (!hasRole) {
    return {
      hasAccess: false,
      reason: `Rôle insuffisant. Requis : ${requiredRoles.join(", ")}`,
      errorCode: AccessErrorCode.INSUFFICIENT_ROLE,
    };
  }

  return {
    hasAccess: true,
    user,
  };
}

/**
 * Vérifie qu'un utilisateur est un administrateur
 * (ADMINISTRATEUR ou SUPER_ADMINISTRATEUR)
 *
 * @returns Résultat avec l'utilisateur si admin
 */
export async function checkAdminAccess(): Promise<AccessCheckResult> {
  const userCheck = await checkUserAccess();
  if (!userCheck.hasAccess || !userCheck.user) {
    return userCheck;
  }

  const user = userCheck.user;
  const isAdmin = isAdminRole(user.role as UserRole);

  if (!isAdmin) {
    return {
      hasAccess: false,
      reason: "Accès réservé aux administrateurs",
      errorCode: AccessErrorCode.INSUFFICIENT_ROLE,
    };
  }

  return {
    hasAccess: true,
    user,
  };
}

/**
 * Vérifie qu'un utilisateur est un agent AMO
 *
 * @returns Résultat avec l'utilisateur si AMO
 */
export async function checkAmoAccess(): Promise<AccessCheckResult> {
  return checkRoleAccess([UserRole.AMO]);
}

/**
 * Vérifie qu'un utilisateur est un particulier
 *
 * @returns Résultat avec l'utilisateur si particulier
 */
export async function checkParticulierAccess(): Promise<AccessCheckResult> {
  return checkRoleAccess([UserRole.PARTICULIER]);
}

/**
 * Vérifie qu'un utilisateur est un agent (tous types)
 * (ADMINISTRATEUR, SUPER_ADMINISTRATEUR, AMO)
 *
 * @returns Résultat avec l'utilisateur si agent
 */
export async function checkAgentAccess(): Promise<AccessCheckResult> {
  const userCheck = await checkUserAccess();
  if (!userCheck.hasAccess || !userCheck.user) {
    return userCheck;
  }

  const user = userCheck.user;
  const isAgent = isAgentRole(user.role as UserRole);

  if (!isAgent) {
    return {
      hasAccess: false,
      reason: "Accès réservé aux agents",
      errorCode: AccessErrorCode.INSUFFICIENT_ROLE,
    };
  }

  return {
    hasAccess: true,
    user,
  };
}

/**
 * Vérifie qu'un utilisateur est connecté via ProConnect
 *
 * @returns Résultat avec l'utilisateur si ProConnect
 */
export async function checkProConnectAccess(): Promise<AccessCheckResult> {
  const userCheck = await checkUserAccess();
  if (!userCheck.hasAccess || !userCheck.user) {
    return userCheck;
  }

  const user = userCheck.user;

  if (user.authMethod !== AUTH_METHODS.PROCONNECT) {
    return {
      hasAccess: false,
      reason: "Authentification ProConnect requise",
      errorCode: AccessErrorCode.WRONG_AUTH_METHOD,
    };
  }

  return {
    hasAccess: true,
    user,
  };
}

/**
 * Vérifie qu'un utilisateur est connecté via FranceConnect
 *
 * @returns Résultat avec l'utilisateur si FranceConnect
 */
export async function checkFranceConnectAccess(): Promise<AccessCheckResult> {
  const userCheck = await checkUserAccess();
  if (!userCheck.hasAccess || !userCheck.user) {
    return userCheck;
  }

  const user = userCheck.user;

  if (user.authMethod !== AUTH_METHODS.FRANCECONNECT) {
    return {
      hasAccess: false,
      reason: "Authentification FranceConnect requise",
      errorCode: AccessErrorCode.WRONG_AUTH_METHOD,
    };
  }

  return {
    hasAccess: true,
    user,
  };
}

/**
 * Vérifie l'accès selon des options personnalisées
 *
 * @param options - Options de vérification (rôles, méthode auth, permissions)
 * @returns Résultat avec l'utilisateur si autorisé
 */
export async function checkAccessWithOptions(options: AccessCheckOptions): Promise<AccessCheckResult> {
  const userCheck = await checkUserAccess();
  if (!userCheck.hasAccess || !userCheck.user) {
    return userCheck;
  }

  const user = userCheck.user;

  // Vérifier les rôles requis
  if (options.requiredRoles && options.requiredRoles.length > 0) {
    const hasRole = options.requiredRoles.includes(user.role as UserRole);
    if (!hasRole) {
      return {
        hasAccess: false,
        reason: `Rôle insuffisant. Requis : ${options.requiredRoles.join(", ")}`,
        errorCode: AccessErrorCode.INSUFFICIENT_ROLE,
      };
    }
  }

  // Vérifier la méthode d'authentification requise
  if (options.requiredAuthMethod && user.authMethod !== options.requiredAuthMethod) {
    return {
      hasAccess: false,
      reason: `Méthode d'authentification incorrecte. Requis : ${options.requiredAuthMethod}`,
      errorCode: AccessErrorCode.WRONG_AUTH_METHOD,
    };
  }

  // TODO: Vérifier les permissions spécifiques via agent_permissions
  // if (options.requiredPermissions && options.requiredPermissions.length > 0) {
  //   const hasPermissions = await checkAgentPermissions(user.id, options.requiredPermissions);
  //   if (!hasPermissions) {
  //     return {
  //       hasAccess: false,
  //       reason: "Permissions insuffisantes",
  //       errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
  //     };
  //   }
  // }

  return {
    hasAccess: true,
    user,
  };
}

/**
 * Helper : Vérifie si l'utilisateur actuel a un des rôles requis
 *
 * @param requiredRoles - Rôles autorisés
 * @returns true si l'utilisateur a un des rôles
 */
export async function hasRequiredRole(requiredRoles: UserRole[]): Promise<boolean> {
  const result = await checkRoleAccess(requiredRoles);
  return result.hasAccess;
}

/**
 * Helper : Vérifie si l'utilisateur actuel est admin
 *
 * @returns true si admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const result = await checkAdminAccess();
  return result.hasAccess;
}

/**
 * Helper : Vérifie si l'utilisateur actuel est AMO
 *
 * @returns true si AMO
 */
export async function isCurrentUserAmo(): Promise<boolean> {
  const result = await checkAmoAccess();
  return result.hasAccess;
}

/**
 * Helper : Vérifie si l'utilisateur actuel est particulier
 *
 * @returns true si particulier
 */
export async function isCurrentUserParticulier(): Promise<boolean> {
  const result = await checkParticulierAccess();
  return result.hasAccess;
}

/**
 * Convertit un AccessCheckResult en ActionResult pour cohérence
 *
 * @param checkResult - Résultat de vérification d'accès
 * @returns ActionResult correspondant
 */
export function toActionResult(checkResult: AccessCheckResult): ActionResult<AuthUser> {
  if (checkResult.hasAccess && checkResult.user) {
    return {
      success: true,
      data: checkResult.user,
    };
  }

  return {
    success: false,
    error: checkResult.reason || "Accès refusé",
  };
}

import { hasPermission, canAccessTab } from "./rbac.service";
import type { BackofficePermission } from "../domain/value-objects/rbac-permissions";

/**
 * Vérifie si l'utilisateur actuel a une permission spécifique
 */
export async function checkBackofficePermission(permission: BackofficePermission): Promise<AccessCheckResult> {
  const userCheck = await checkUserAccess();
  if (!userCheck.hasAccess || !userCheck.user) {
    return userCheck;
  }

  const user = userCheck.user;
  const hasRequiredPermission = hasPermission(user.role as UserRole, permission);

  if (!hasRequiredPermission) {
    return {
      hasAccess: false,
      reason: `Permission insuffisante : ${permission}`,
      errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
    };
  }

  return {
    hasAccess: true,
    user,
  };
}

/**
 * Vérifie si l'utilisateur actuel peut accéder à un onglet du backoffice
 */
export async function checkTabAccess(tabKey: string): Promise<AccessCheckResult> {
  const userCheck = await checkUserAccess();
  if (!userCheck.hasAccess || !userCheck.user) {
    return userCheck;
  }

  const user = userCheck.user;
  const canAccess = canAccessTab(user.role as UserRole, tabKey);

  if (!canAccess) {
    return {
      hasAccess: false,
      reason: `Accès refusé à l'onglet : ${tabKey}`,
      errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
    };
  }

  return {
    hasAccess: true,
    user,
  };
}
