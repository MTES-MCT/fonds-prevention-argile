import { getServerEnv } from "@/shared/config/env.config";
import { FC_ENDPOINTS } from "./franceconnect.constants";

/**
 * Helper pour construire les URLs FranceConnect
 */
export function getFranceConnectUrls(baseUrl?: string) {
  const base = baseUrl || getServerEnv().FC_BASE_URL;

  return {
    authorization: `${base}${FC_ENDPOINTS.AUTHORIZATION}`,
    token: `${base}${FC_ENDPOINTS.TOKEN}`,
    userinfo: `${base}${FC_ENDPOINTS.USERINFO}`,
    logout: `${base}${FC_ENDPOINTS.LOGOUT}`,
    jwks: `${base}${FC_ENDPOINTS.JWKS}`,
    discovery: `${base}${FC_ENDPOINTS.DISCOVERY}`,
  };
}

/**
 * Configuration FranceConnect complète
 */
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
