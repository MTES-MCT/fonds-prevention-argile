/**
 * Décodage JWT simple - Sans crypto, compatible partout
 */

import type { JWTPayload } from "../core/auth.types";

/**
 * Décode un token JWT sans vérifier la signature
 * Fonctionne côté client et dans le middleware
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    return payload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  return !payload?.exp || payload.exp < Date.now();
}

export function getRoleFromToken(token: string): string | null {
  return decodeToken(token)?.user?.role || null;
}
