import { getServerEnv } from "@/shared/config/env.config";
import { PC_ENDPOINTS } from "./proconnect.constants";

// Helper pour construire les URLs ProConnect
export function getProConnectUrls(baseUrl?: string) {
  const base = baseUrl || getServerEnv().PC_BASE_URL;

  return {
    authorization: `${base}${PC_ENDPOINTS.AUTHORIZATION}`,
    token: `${base}${PC_ENDPOINTS.TOKEN}`,
    userinfo: `${base}${PC_ENDPOINTS.USERINFO}`,
    logout: `${base}${PC_ENDPOINTS.LOGOUT}`,
    jwks: `${base}${PC_ENDPOINTS.JWKS}`,
    discovery: `${base}${PC_ENDPOINTS.DISCOVERY}`,
  };
}

// Configuration ProConnect complète
export function getProConnectConfig() {
  const env = getServerEnv();
  const urls = getProConnectUrls();

  return {
    clientId: env.PC_CLIENT_ID,
    clientSecret: env.PC_CLIENT_SECRET,
    callbackUrl: env.PC_CALLBACK_URL,
    postLogoutUrl: env.PC_POST_LOGOUT_URL,
    scopes: env.PC_SCOPES,
    acrValues: env.PC_ACR_VALUES,
    stateTTL: env.PC_STATE_TTL,
    urls,
  };
}
