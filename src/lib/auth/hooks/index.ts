"use client";

import { useAuth } from "../contexts/AuthContext";
import { ROLES } from "../core/auth.constants";

/**
 * Hook pour récupérer uniquement l'utilisateur courant
 */
export function useCurrentUser() {
  const { user, isLoading } = useAuth();
  return { user, isLoading };
}

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

/**
 * Hook pour vérifier si authentifié avec FranceConnect
 */
export function useIsFranceConnect() {
  const { user } = useAuth();
  return user?.authMethod === "franceconnect";
}
