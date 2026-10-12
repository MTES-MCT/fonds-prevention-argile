import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";
import { getServerEnv } from "@/shared/config/env.config";
import { getProConnectConfig } from "./proconnect.config";
import { PC_ENDPOINTS } from "./proconnect.constants";

// Algorithme enregistré pour nos clients ProConnect (staging et prod) : le changer là-bas impose de le changer ici.
const ALGORITHMES_AUTORISES = ["RS256"];
const TOLERANCE_HORLOGE_SECONDES = 60;

export class JetonProConnectInvalideError extends Error {
  constructor(raison: string) {
    super(`[ProConnect] Jeton invalide : ${raison}`);
    this.name = "JetonProConnectInvalideError";
  }
}

export interface ContexteVerificationProConnect {
  issuer: string;
  clientId: string;
  jwks: JWTVerifyGetKey;
}

export interface ClaimsIdTokenProConnect {
  sub: string;
  acr: unknown;
  amr: unknown;
}

let jwksDistant: { url: string; getKey: JWTVerifyGetKey } | null = null;

function getJwksDistant(url: string): JWTVerifyGetKey {
  if (jwksDistant?.url !== url) {
    jwksDistant = { url, getKey: createRemoteJWKSet(new URL(url)) };
  }
  return jwksDistant.getKey;
}

export function getContexteVerificationProConnect(): ContexteVerificationProConnect {
  const config = getProConnectConfig();
  const base = getServerEnv().PC_BASE_URL;

  return {
    issuer: `${base}${PC_ENDPOINTS.ISSUER}`,
    clientId: config.clientId,
    jwks: getJwksDistant(config.urls.jwks),
  };
}

async function verifierSignature(jeton: string, contexte: ContexteVerificationProConnect): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(jeton, contexte.jwks, {
      algorithms: ALGORITHMES_AUTORISES,
      clockTolerance: TOLERANCE_HORLOGE_SECONDES,
    });
    return payload;
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "inconnu";
    throw new JetonProConnectInvalideError(`signature ou dates (${code})`);
  }
}

function verifierEmetteur(payload: JWTPayload, contexte: ContexteVerificationProConnect): void {
  if (payload.iss !== contexte.issuer) {
    throw new JetonProConnectInvalideError("émetteur inattendu");
  }
}

function verifierAudience(payload: JWTPayload, contexte: ContexteVerificationProConnect): void {
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(contexte.clientId)) {
    throw new JetonProConnectInvalideError("audience inattendue");
  }

  // OIDC Core 3.1.3.7 : plusieurs audiences exigent un azp égal à notre client.
  if (audiences.length > 1 && payload.azp !== contexte.clientId) {
    throw new JetonProConnectInvalideError("azp inattendu");
  }
}

export async function verifierIdTokenProConnect(
  idToken: string,
  nonceAttendu: string | undefined,
  contexte: ContexteVerificationProConnect
): Promise<ClaimsIdTokenProConnect> {
  const payload = await verifierSignature(idToken, contexte);
  verifierEmetteur(payload, contexte);
  verifierAudience(payload, contexte);

  if (typeof payload.exp !== "number") {
    throw new JetonProConnectInvalideError("expiration absente");
  }
  if (!nonceAttendu || payload.nonce !== nonceAttendu) {
    throw new JetonProConnectInvalideError("nonce");
  }
  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new JetonProConnectInvalideError("sub absent");
  }

  return { sub: payload.sub, acr: payload.acr, amr: payload.amr };
}

// UserInfo est du JSON si aucun algorithme n'a été déclaré à ProConnect, un JWT signé sinon.
export async function lireUserInfoProConnect(
  corps: string,
  contexte: ContexteVerificationProConnect
): Promise<Record<string, unknown>> {
  const texte = corps.trim();

  if (texte.startsWith("{")) {
    return JSON.parse(texte) as Record<string, unknown>;
  }

  const payload = await verifierSignature(texte, contexte);
  // iss et aud ne sont que recommandés dans un UserInfo signé : vérifiés seulement s'ils sont présents.
  if (payload.iss !== undefined) verifierEmetteur(payload, contexte);
  if (payload.aud !== undefined) verifierAudience(payload, contexte);
  return payload;
}
