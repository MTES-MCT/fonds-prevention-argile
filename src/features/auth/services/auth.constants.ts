// Énumération des rôles
export const ROLES = {
  ADMIN: "admin",
  PARTICULIER: "particulier",
} as const;

// Énumération des méthodes d'authentification
export const AUTH_METHODS = {
  PASSWORD: "password",
  FRANCECONNECT: "franceconnect",
} as const;

// Noms des cookies
export const COOKIE_NAMES = {
  SESSION: "session",
  SESSION_ROLE: "session_role",
  SESSION_AUTH: "session_auth",
  REDIRECT_TO: "redirectTo",
  FC_STATE: "fc_state",
  FC_NONCE: "fc_nonce",
} as const;

// Codes d'erreur (incluant FranceConnect)
export const ERROR_CODES = {
  // Erreurs générales
  UNAUTHORIZED: "UNAUTHORIZED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  INVALID_STATE: "INVALID_STATE",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  ROLE_MISMATCH: "ROLE_MISMATCH",
  LOGOUT_ERROR: "LOGOUT_ERROR",
  INVALID_SESSION: "INVALID_SESSION",
  INVALID_TOKEN: "INVALID_TOKEN",

  // Erreurs FranceConnect spécifiques
  FRANCECONNECT_ERROR: "FRANCECONNECT_ERROR",
  FC_CANCELLED: "fc_cancelled",
  FC_SERVER_ERROR: "fc_server_error",
  FC_INVALID_STATE: "fc_invalid_state",
  FC_TOKEN_ERROR: "fc_token_error",
  FC_AUTH_FAILED: "fc_auth_failed",
  FC_MISSING_PARAMS: "fc_missing_params",
  FC_INVALID_REQUEST: "fc_invalid_request",
  FC_UNAUTHORIZED: "fc_unauthorized",
} as const;
