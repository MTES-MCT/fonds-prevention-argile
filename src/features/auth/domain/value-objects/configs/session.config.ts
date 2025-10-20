import { isProduction } from "@/shared/config/env.config";

/**
 * Durées de session en secondes
 */
export const SESSION_DURATION = {
  admin: 8 * 60 * 60, // 8 heures
  particulier: 24 * 60 * 60, // 24 heures
  redirectCookie: 5 * 60, // 5 minutes
} as const;

/**
 * Options de cookies sécurisés (base)
 */
const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction(),
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Crée les options de cookie avec expiration optionnelle
 */
export function getCookieOptions(maxAge?: number) {
  return {
    ...BASE_COOKIE_OPTIONS,
    ...(maxAge && { maxAge }),
  };
}
