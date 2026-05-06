import { timingSafeEqual } from "node:crypto";

/**
 * Comparaison constant-time entre deux secrets (token, API key, signature, ...).
 *
 * Évite les attaques par timing qui pourraient permettre à un attaquant de deviner le secret en mesurant le temps de réponse du serveur.
 *
 * À utiliser pour vérifier des Bearer tokens, des signatures HMAC, etc.
 */
export function safeTokenEquals(received: string, expected: string): boolean {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
