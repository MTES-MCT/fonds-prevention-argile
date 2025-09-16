/**
 * Configuration FranceConnect - Version MVP
 */

import { getServerEnv } from "@/lib/config/env.config";

// Helper pour construire les URLs FranceConnect
export function getFranceConnectUrls(baseUrl?: string) {
  const base = baseUrl || getServerEnv().FC_BASE_URL;

  return {
    authorization: `${base}/api/v2/authorize`,
    token: `${base}/api/v2/token`,
    userinfo: `${base}/api/v2/userinfo`,
    logout: `${base}/api/v2/session/end`,
    jwks: `${base}/api/v2/jwks`,
  };
}

// Configuration FranceConnect complète
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
