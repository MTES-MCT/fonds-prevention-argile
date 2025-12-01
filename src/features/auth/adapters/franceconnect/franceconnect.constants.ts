/**
 * Constantes FranceConnect
 * Valeurs fixes utilisées par le fournisseur d'identité
 */

/**
 * Environnements FranceConnect disponibles
 */
export const FC_ENVIRONMENTS = {
  INTEGRATION: "https://fcp.integ01.dev-franceconnect.fr",
  PRODUCTION: "https://app.franceconnect.gouv.fr",
} as const;

/**
 * Endpoints API FranceConnect (v2)
 */
export const FC_ENDPOINTS = {
  AUTHORIZATION: "/api/v2/authorize",
  TOKEN: "/api/v2/token",
  USERINFO: "/api/v2/userinfo",
  LOGOUT: "/api/v2/session/end",
  JWKS: "/api/v2/jwks",
  DISCOVERY: "/api/v2/.well-known/openid-configuration",
} as const;

/**
 * Codes d'erreur FranceConnect
 */
export const FC_ERROR_CODES = {
  // Codes génériques FranceConnect
  FRANCECONNECT_ERROR: "FRANCECONNECT_ERROR",
  FRANCECONNECT_CANCELLED: "FRANCECONNECT_CANCELLED",

  // Codes spécifiques FC
  FC_CANCELLED: "FC_CANCELLED",
  FC_SERVER_ERROR: "FC_SERVER_ERROR",
  FC_INVALID_STATE: "FC_INVALID_STATE",
  FC_TOKEN_ERROR: "FC_TOKEN_ERROR",
  FC_AUTH_FAILED: "FC_AUTH_FAILED",
  FC_MISSING_PARAMS: "FC_MISSING_PARAMS",
  FC_INVALID_REQUEST: "FC_INVALID_REQUEST",
  FC_UNAUTHORIZED: "FC_UNAUTHORIZED",

  // Codes OAuth standards (pour le mapping)
  INVALID_REQUEST: "invalid_request",
  UNAUTHORIZED_CLIENT: "unauthorized_client",
  ACCESS_DENIED: "access_denied",
  UNSUPPORTED_RESPONSE_TYPE: "unsupported_response_type",
  INVALID_SCOPE: "invalid_scope",
  SERVER_ERROR: "server_error",
  TEMPORARILY_UNAVAILABLE: "temporarily_unavailable",
} as const;
