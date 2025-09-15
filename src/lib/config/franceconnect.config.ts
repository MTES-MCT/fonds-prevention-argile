// lib/config/franceconnect.config.ts

import { getServerEnv } from "./env.config";

/**
 * Configuration et helpers pour FranceConnect
 */

// Helper pour construire les URLs FranceConnect
export function getFranceConnectUrls(baseUrl?: string) {
  const base = baseUrl || getServerEnv().FC_BASE_URL;

  return {
    authorization: `${base}/api/v1/authorize`,
    token: `${base}/api/v1/token`,
    userinfo: `${base}/api/v1/userinfo`,
    logout: `${base}/api/v1/logout`,
    jwks: `${base}/api/v1/jwks`,
  };
}

// Helper pour récupérer la configuration FranceConnect
export function getFranceConnectConfig() {
  const env = getServerEnv();
  const urls = getFranceConnectUrls();

  return {
    clientId: env.FC_CLIENT_ID,
    clientSecret: env.FC_CLIENT_SECRET,
    callbackUrl: env.FC_CALLBACK_URL,
    postLogoutUrl: env.FC_POST_LOGOUT_URL,
    scopes: env.FC_SCOPES,
    acrValues: env.FC_ACR_VALUES,
    stateTTL: env.FC_STATE_TTL,
    urls,
  };
}

// Noms des cookies utilisés pour FranceConnect
export const FC_COOKIES = {
  STATE: "fc_state",
  NONCE: "fc_nonce",
  CODE_VERIFIER: "fc_code_verifier",
} as const;

// Options des cookies sécurisés
export function getSecureCookieOptions(maxAge: number = 300) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge, // en secondes
  };
}

// Helper pour générer des chaînes aléatoires sécurisées
export function generateSecureRandomString(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const array = new Uint8Array(length);

  // Utilisation de crypto pour une génération sécurisée
  if (typeof globalThis.crypto !== "undefined") {
    globalThis.crypto.getRandomValues(array);
  } else {
    // Fallback pour Node.js
    const crypto = require("crypto");
    crypto.randomFillSync(array);
  }

  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }

  return result;
}
