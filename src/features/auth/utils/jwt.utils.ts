/**
 * JWT utils complet - Serveur uniquement (utilise crypto)
 */

import crypto from "crypto";
import { JWTPayload } from "../domain/entities";

// Même règle que JWT_SECRET dans env.config.ts, lue à part : getServerEnv exige tout le schéma serveur.
const LONGUEUR_MIN_JWT_SECRET = 32;

function lireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < LONGUEUR_MIN_JWT_SECRET) {
    throw new Error(`JWT_SECRET absent ou trop court (${LONGUEUR_MIN_JWT_SECRET} caractères minimum)`);
  }
  return secret;
}

/**
 * Crée un token JWT (serveur uniquement)
 */
export function createToken(payload: JWTPayload): string {
  const secret = lireJwtSecret();
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");

  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac("sha256", secret).update(dataToSign).digest("base64url");

  return `${dataToSign}.${signature}`;
}

/**
 * Vérifie un token JWT (serveur uniquement)
 */
export function verifyToken(token: string): JWTPayload | null {
  // Hors du try : un secret manquant doit casser bruyamment, pas déconnecter tout le monde en silence.
  const secret = lireJwtSecret();
  try {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) return null;

    const expectedSignature = crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");

    // Comparaison des chaînes et non des octets décodés : le base64url de Node tolère des variantes.
    const recue = Buffer.from(signature);
    const attendue = Buffer.from(expectedSignature);
    if (recue.length !== attendue.length || !crypto.timingSafeEqual(recue, attendue)) return null;

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString()) as JWTPayload;
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
export function decodeToken<T = Record<string, unknown>>(token: string): T | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    return JSON.parse(Buffer.from(payload, "base64url").toString()) as T;
  } catch {
    return null;
  }
}
