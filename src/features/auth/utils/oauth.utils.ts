/**
 * Utilitaires OAuth partagés entre FranceConnect et ProConnect
 */

/**
 * Génère une chaîne aléatoire sécurisée (pour state et nonce)
 * Compatible OAuth2 et OpenID Connect
 */
export function generateSecureRandomString(length: number = 32): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";

  // Utiliser crypto.getRandomValues pour la sécurité (compatible browser + Node.js 18+)
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }

  return result;
}

/**
 * Parse une réponse JSON ou JWT
 * Les fournisseurs OIDC peuvent renvoyer soit du JSON brut, soit un JWT selon la config
 */
export async function parseJSONorJWT<T>(response: Response): Promise<T> {
  const text = await response.text();

  try {
    // Essayer de parser comme JSON d'abord
    return JSON.parse(text) as T;
  } catch {
    // Si c'est un JWT (3 parties séparées par des points)
    const parts = text.split(".");
    if (parts.length === 3) {
      const payload = parts[1];

      // Décoder base64url (compatible avec Buffer Node.js et atob browser)
      const decoded = typeof Buffer !== "undefined" ? Buffer.from(payload, "base64").toString("utf-8") : atob(payload);

      return JSON.parse(decoded) as T;
    }

    throw new Error("Format de réponse invalide (ni JSON ni JWT)");
  }
}

/**
 * Construit une URL avec des paramètres
 */
export function buildUrlWithParams(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  return url.toString();
}
