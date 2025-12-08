import type { UserRole } from "@/shared/domain/value-objects";
import { ROLE_PERMISSIONS, BackofficePermission } from "../domain/value-objects/rbac-permissions";

/**
 * Vérifie si un rôle possède une permission spécifique
 */
export function hasPermission(role: UserRole, permission: BackofficePermission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Vérifie si un rôle possède toutes les permissions requises
 */
export function hasAllPermissions(role: UserRole, requiredPermissions: BackofficePermission[]): boolean {
  return requiredPermissions.every((permission) => hasPermission(role, permission));
}

/**
 * Vérifie si un rôle possède au moins une des permissions requises
 */
export function hasAnyPermission(role: UserRole, requiredPermissions: BackofficePermission[]): boolean {
  return requiredPermissions.some((permission) => hasPermission(role, permission));
}

/**
 * Récupère toutes les permissions d'un rôle
 */
export function getRolePermissions(role: UserRole): BackofficePermission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Vérifie si un rôle peut accéder à un onglet
 */
export function canAccessTab(role: UserRole, tabKey: string): boolean {
  const { TAB_PERMISSIONS } = require("../domain/value-objects/rbac-permissions");
  const requiredPermissions = TAB_PERMISSIONS[tabKey] || [];

  if (requiredPermissions.length === 0) {
    return true; // Pas de permissions requises = accès libre
  }

  return hasAnyPermission(role, requiredPermissions);
}
