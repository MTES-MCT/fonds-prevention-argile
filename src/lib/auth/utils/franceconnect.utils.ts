import crypto from "crypto";

/**
 * Génère une chaîne aléatoire sécurisée (pour state et nonce)
 * Valide pour OAuth2 et OpenID Connect (et FranceConnect)
 */
export function generateSecureRandomString(length: number = 32): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const randomValues = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }

  return result;
}

/**
 * Parse une réponse qui peut être JWT ou JSON
 */
export async function parseJSONorJWT<T>(response: Response): Promise<T> {
  const text = await response.text();

  // Si c'est un JWT (3 parties séparées par des points)
  if (text.split(".").length === 3) {
    const payload = text.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as T;
  }

  // Sinon c'est du JSON
  return JSON.parse(text) as T;
}

/**
 * Construit une URL avec des paramètres
 */
export function buildUrl(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  return url.toString();
}
