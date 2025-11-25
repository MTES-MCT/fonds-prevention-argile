"use client";
import { ROLES, useAuth } from "../client";

/**
 * Hook pour vérifier si l'utilisateur est un agent (admin, instructeur, amo)
 */
export function useIsAgent() {
  const { user } = useAuth();
  return user?.role === ROLES.ADMIN || user?.role === ROLES.INSTRUCTEUR || user?.role === ROLES.AMO;
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
