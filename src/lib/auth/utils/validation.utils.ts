import { ROLES, AUTH_METHODS } from "../core/auth.constants";
import type { UserRole, AuthMethod } from "../core/auth.types";

/**
 * Vérifie si une valeur est un rôle valide
 */
export function isValidRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" &&
    Object.values(ROLES).includes(value as UserRole)
  );
}

/**
 * Vérifie si une valeur est une méthode d'auth valide
 */
export function isValidAuthMethod(value: unknown): value is AuthMethod {
  return (
    typeof value === "string" &&
    Object.values(AUTH_METHODS).includes(value as AuthMethod)
  );
}

/**
 * Valide un email (basique)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valide les cookies de session
 */
export function validateSessionCookies(cookies: {
  session?: string;
  session_role?: string;
  session_auth?: string;
}): boolean {
  if (!cookies.session) return false;

  if (cookies.session_role && !isValidRole(cookies.session_role)) {
    return false;
  }

  if (cookies.session_auth && !isValidAuthMethod(cookies.session_auth)) {
    return false;
  }

  return true;
}
