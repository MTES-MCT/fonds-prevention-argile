import { ROLES, AUTH_METHODS } from "./auth.constants";

// Types dérivés des constantes
export type UserRole = (typeof ROLES)[keyof typeof ROLES];
export type AuthMethod = (typeof AUTH_METHODS)[keyof typeof AUTH_METHODS];

// Utilisateur authentifié
export interface AuthUser {
  role: UserRole;
  authMethod: AuthMethod;
  loginTime: string;

  // Infos optionnelles
  firstName?: string;
  lastName?: string;
  email?: string;
  fcSub?: string; // ID FranceConnect
  fcIdToken?: string; // Pour la déconnexion FC
}

// Payload JWT
export interface JWTPayload {
  user: AuthUser;
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
}

// Cookies de session
export interface SessionCookies {
  session?: string;
  session_role?: string;
  session_auth?: string;
  redirectTo?: string;
}
