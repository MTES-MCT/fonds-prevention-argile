"use client";
import { useAuth } from "../client";
import { ROLES } from "../services/auth.constants";

/**
 * Hook pour vérifier si l'utilisateur est admin
 */
export function useIsAdmin() {
  const { user } = useAuth();
  return user?.role === ROLES.ADMIN;
}

/**
 * Hook pour vérifier si l'utilisateur est un particulier
 */
export function useIsParticulier() {
  const { user } = useAuth();
  return user?.role === ROLES.PARTICULIER;
}

/**
 * Hook pour vérifier un rôle spécifique
 */
export function useHasRole(role: string) {
  const { user } = useAuth();
  return user?.role === role;
}
