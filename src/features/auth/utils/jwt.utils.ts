/**
 * JWT utils complet - Serveur uniquement (utilise crypto)
 */

import crypto from "crypto";
import type { JWTPayload } from "../core/auth.types";

const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";

/**
 * Crée un token JWT (serveur uniquement)
 */
export function createToken(payload: JWTPayload): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    "base64url"
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );

  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(dataToSign)
    .digest("base64url");

  return `${dataToSign}.${signature}`;
}

/**
 * Vérifie un token JWT (serveur uniquement)
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url");

    if (signature !== expectedSignature) return null;

    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString()
    ) as JWTPayload;
    if (decoded.exp && decoded.exp < Date.now()) return null;

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Décode un token JWT sans vérifier la signature
 * Utile pour lire les claims d'un token externe (ex: FranceConnect)
 */
export function decodeToken<T = Record<string, unknown>>(
  token: string
): T | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    return JSON.parse(Buffer.from(payload, "base64url").toString()) as T;
  } catch {
    return null;
  }
}
