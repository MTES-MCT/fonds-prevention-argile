import { UserRole } from "@/shared/domain/value-objects";

/**
 * Rôles utilisateurs (réexporté depuis shared)
 */
export const ROLES = {
  PARTICULIER: UserRole.PARTICULIER,
  ADMINISTRATEUR: UserRole.ADMINISTRATEUR,
  SUPER_ADMINISTRATEUR: UserRole.SUPER_ADMINISTRATEUR,
  AMO: UserRole.AMO,
  ANALYSTE: UserRole.ANALYSTE,
  ALLERS_VERS: UserRole.ALLERS_VERS,
  AMO_ET_ALLERS_VERS: UserRole.AMO_ET_ALLERS_VERS,
} as const;

// Énumération des méthodes d'authentification
export const AUTH_METHODS = {
  PASSWORD: "password",
  FRANCECONNECT: "franceconnect",
  PROCONNECT: "proconnect",
} as const;

// Noms des cookies
export const COOKIE_NAMES = {
  SESSION: "session",
  SESSION_ROLE: "session_role",
  SESSION_AUTH: "session_auth",
  REDIRECT_TO: "redirectTo",
  FC_STATE: "fc_state",
  FC_NONCE: "fc_nonce",
  PC_STATE: "pc_state",
  PC_NONCE: "pc_nonce",
} as const;

// Codes d'erreur auth génériques
export const AUTH_ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  INVALID_STATE: "INVALID_STATE",
  INVALID_NONCE: "INVALID_NONCE",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  ROLE_MISMATCH: "ROLE_MISMATCH",
  LOGOUT_ERROR: "LOGOUT_ERROR",
  INVALID_SESSION: "INVALID_SESSION",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXCHANGE_FAILED: "TOKEN_EXCHANGE_FAILED",
  USERINFO_FAILED: "USERINFO_FAILED",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;
