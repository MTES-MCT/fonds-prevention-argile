"use client";
import { ROLES, useAuth } from "../client";
import { AgentRole } from "@/shared/domain/value-objects/user-role.enum";

/**
 * Hook pour vérifier si l'utilisateur est un agent (admin, instructeur, amo)
 */
export function useIsAgent() {
  const { user } = useAuth();
  return (
    user?.role === ROLES.ADMINISTRATEUR ||
    user?.role === ROLES.SUPER_ADMINISTRATEUR ||
    user?.role === ROLES.AMO ||
    user?.role === ROLES.ANALYSTE
  );
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
 * Hook pour récupérer le rôle agent spécifique
 * Retourne le rôle si l'utilisateur est un agent, null sinon
 */
export function useAgentRole(): AgentRole | null {
  const { user } = useAuth();

  if (!user) return null;

  if (
    user.role === ROLES.ADMINISTRATEUR ||
    user.role === ROLES.SUPER_ADMINISTRATEUR ||
    user.role === ROLES.AMO ||
    user.role === ROLES.ANALYSTE
  ) {
    return user.role as AgentRole;
  }

  return null;
}

/**
 * Hook pour vérifier si l'utilisateur a le rôle Analyste
 */
export function useIsAnalyste(): boolean {
  const { user } = useAuth();
  return user?.role === ROLES.ANALYSTE;
}
