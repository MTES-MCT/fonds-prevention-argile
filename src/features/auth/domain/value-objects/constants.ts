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

// Codes d'erreur auth génériques
export const AUTH_ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  INVALID_STATE: "INVALID_STATE",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  ROLE_MISMATCH: "ROLE_MISMATCH",
  LOGOUT_ERROR: "LOGOUT_ERROR",
  INVALID_SESSION: "INVALID_SESSION",
  INVALID_TOKEN: "INVALID_TOKEN",
} as const;
