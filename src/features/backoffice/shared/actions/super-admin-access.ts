"use server";

import { UserRole } from "@/shared/domain/value-objects";
import type { Agent } from "@/shared/database/schema/agents";
import { getCurrentAgent } from "./agent.actions";

type EspaceAgentAccess =
  | { kind: "agent"; agent: Agent }
  | { kind: "super-admin"; agent: Agent }
  | { kind: "error"; error: string };

/**
 * Résout l'accès à l'espace agent.
 * - AMO / Allers-vers / AMO_ET_ALLERS_VERS → { kind: "agent", agent }
 * - SUPER_ADMINISTRATEUR → { kind: "super-admin", agent } (lecture globale, sans filtre)
 * - Autre / non connecté → { kind: "error", error }
 */
export async function resolveEspaceAgentAccess(): Promise<EspaceAgentAccess> {
  const agentResult = await getCurrentAgent();
  if (!agentResult.success) {
    return { kind: "error", error: agentResult.error };
  }

  const agent = agentResult.data;

  if (agent.role === UserRole.SUPER_ADMINISTRATEUR) {
    return { kind: "super-admin", agent };
  }

  return { kind: "agent", agent };
}

/**
 * À appeler en tête des server actions d'écriture dans /espace-agent/**.
 * Retourne une erreur si l'agent courant est SUPER_ADMIN (mode lecture seule).
 * Retourne null sinon (y compris si non authentifié — laissons la vérif d'auth classique agir).
 */
export async function assertNotSuperAdminReadOnly(): Promise<string | null> {
  const agentResult = await getCurrentAgent();
  if (agentResult.success && agentResult.data.role === UserRole.SUPER_ADMINISTRATEUR) {
    return "Action non autorisée : l'espace agent est en lecture seule pour les super administrateurs.";
  }
  return null;
}

/**
 * Indique si l'agent courant est un SUPER_ADMIN (utile pour afficher le bandeau).
 */
export async function isCurrentUserSuperAdmin(): Promise<boolean> {
  const agentResult = await getCurrentAgent();
  return agentResult.success && agentResult.data.role === UserRole.SUPER_ADMINISTRATEUR;
}
