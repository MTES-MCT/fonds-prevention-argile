"use client";
import { useAuth } from "../client";
import { hasPermission, canAccessTab } from "../permissions/services/rbac.service";
import type { BackofficePermission } from "../permissions/domain/value-objects/rbac-permissions";
import type { UserRole } from "@/shared/domain/value-objects";

/**
 * Hook pour vérifier si l'utilisateur a une permission spécifique
 */
export function useHasPermission(permission: BackofficePermission): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return hasPermission(user.role as UserRole, permission);
}

/**
 * Hook pour vérifier si l'utilisateur peut accéder à un onglet
 */
export function useCanAccessTab(tabKey: string): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return canAccessTab(user.role as UserRole, tabKey);
}
