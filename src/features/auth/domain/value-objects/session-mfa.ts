import { isAgentRole } from "@/shared/domain/value-objects";
import { AUTH_METHODS } from "./constants";

// Niveaux eIDAS impliquant un second facteur (doc ProConnect « Forcer la double authentification »).
export const ACR_MFA_PROCONNECT = ["eidas0-mfa", "eidas1-mfa", "eidas2", "eidas3"] as const;

export type AcrMfaProConnect = (typeof ACR_MFA_PROCONNECT)[number];

export function estAcrMfa(acr: unknown): acr is AcrMfaProConnect {
  return typeof acr === "string" && (ACR_MFA_PROCONNECT as readonly string[]).includes(acr);
}

// Paramètre `claims` de /authorize : ProConnect impose le second facteur avant de nous rendre la main.
export function buildClaimsMfaProConnect(): string {
  return JSON.stringify({
    id_token: { acr: { essential: true, values: [...ACR_MFA_PROCONNECT] } },
  });
}

interface SessionAControler {
  authMethod?: unknown;
  role?: unknown;
  proConnectAcr?: unknown;
}

// Seul un demandeur FranceConnect échappe à la MFA : tout rôle agent doit la prouver par ProConnect.
export function estSessionConforme(session: SessionAControler | null | undefined): boolean {
  if (!session) return false;

  const estAgent = typeof session.role === "string" && isAgentRole(session.role);
  if (session.authMethod === AUTH_METHODS.FRANCECONNECT && !estAgent) return true;

  return session.authMethod === AUTH_METHODS.PROCONNECT && estAcrMfa(session.proConnectAcr);
}
