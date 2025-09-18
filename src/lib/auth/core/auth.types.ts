import { ROLES, AUTH_METHODS } from "./auth.constants";

// Types dérivés des constantes
export type UserRole = (typeof ROLES)[keyof typeof ROLES];
export type AuthMethod = (typeof AUTH_METHODS)[keyof typeof AUTH_METHODS];

// Utilisateur authentifié
export interface AuthUser {
  id: string;
  role: string;
  authMethod: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  loginTime: string;
}

// Payload JWT
export interface JWTPayload {
  userId: string; // UUID de l'utilisateur en base
  role: string;
  authMethod: string;
  fcIdToken?: string;
  exp: number;
  iat: number;
}

// Cookies de session
export interface SessionCookies {
  session?: string;
  session_role?: string;
  session_auth?: string;
  redirectTo?: string;
}
