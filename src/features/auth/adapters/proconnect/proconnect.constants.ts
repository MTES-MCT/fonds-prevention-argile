/**
 * Constantes ProConnect
 * Valeurs fixes utilisées par le fournisseur d'identité
 */

/**
 * Environnements ProConnect disponibles
 */
export const PC_ENVIRONMENTS = {
  INTEGRATION_INTERNET: "https://fca.integ01.dev-agentconnect.fr",
  INTEGRATION_RIE: "https://fca.integ02.agentconnect.rie.gouv.fr",
  PRODUCTION_INTERNET: "https://auth.agentconnect.gouv.fr",
  PRODUCTION_RIE: "https://auth.agentconnect.rie.gouv.fr",
} as const;

/**
 * Endpoints API ProConnect (v2)
 */
export const PC_ENDPOINTS = {
  AUTHORIZATION: "/api/v2/authorize",
  TOKEN: "/api/v2/token",
  USERINFO: "/api/v2/userinfo",
  LOGOUT: "/api/v2/session/end",
  JWKS: "/api/v2/jwks",
  DISCOVERY: "/api/v2/.well-known/openid-configuration",
} as const;

/**
 * Codes d'erreur ProConnect possibles
 */
export const PC_ERROR_CODES = {
  INVALID_REQUEST: "invalid_request",
  UNAUTHORIZED_CLIENT: "unauthorized_client",
  ACCESS_DENIED: "access_denied",
  UNSUPPORTED_RESPONSE_TYPE: "unsupported_response_type",
  INVALID_SCOPE: "invalid_scope",
  SERVER_ERROR: "server_error",
  TEMPORARILY_UNAVAILABLE: "temporarily_unavailable",
  INTERACTION_REQUIRED: "interaction_required",
  LOGIN_REQUIRED: "login_required",
  ACCOUNT_SELECTION_REQUIRED: "account_selection_required",
  CONSENT_REQUIRED: "consent_required",
  INVALID_REQUEST_URI: "invalid_request_uri",
  INVALID_REQUEST_OBJECT: "invalid_request_object",
  REQUEST_NOT_SUPPORTED: "request_not_supported",
  REQUEST_URI_NOT_SUPPORTED: "request_uri_not_supported",
  REGISTRATION_NOT_SUPPORTED: "registration_not_supported",
  PROCONNECT_ERROR: "PROCONNECT_ERROR",
  PROCONNECT_CANCELLED: "PROCONNECT_CANCELLED",
} as const;
