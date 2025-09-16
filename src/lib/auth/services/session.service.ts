import { cookies } from "next/headers";
import { COOKIE_NAMES } from "../core/auth.constants";
import { SESSION_DURATION, getCookieOptions } from "../config/session.config";
import type { AuthUser, UserRole } from "../core/auth.types";

/**
 * Crée les cookies de session
 */
export async function createSessionCookies(
  token: string,
  user: AuthUser
): Promise<void> {
  const cookieStore = await cookies();
  const maxAge = SESSION_DURATION[user.role];

  // Cookie principal avec le JWT
  cookieStore.set(COOKIE_NAMES.SESSION, token, getCookieOptions(maxAge));

  // Cookies d'optimisation (évite de décoder le JWT dans le middleware)
  cookieStore.set(
    COOKIE_NAMES.SESSION_ROLE,
    user.role,
    getCookieOptions(maxAge)
  );

  cookieStore.set(
    COOKIE_NAMES.SESSION_AUTH,
    user.authMethod,
    getCookieOptions(maxAge)
  );
}

/**
 * Supprime tous les cookies de session
 */
export async function clearSessionCookies(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(COOKIE_NAMES.SESSION);
  cookieStore.delete(COOKIE_NAMES.SESSION_ROLE);
  cookieStore.delete(COOKIE_NAMES.SESSION_AUTH);
  cookieStore.delete(COOKIE_NAMES.REDIRECT_TO);
}

/**
 * Récupère le rôle depuis les cookies (optimisation)
 */
export async function getRoleFromCookies(): Promise<UserRole | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAMES.SESSION_ROLE)?.value as UserRole | null;
}

/**
 * Sauvegarde l'URL de redirection après connexion
 */
export async function saveRedirectUrl(url: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    COOKIE_NAMES.REDIRECT_TO,
    url,
    getCookieOptions(SESSION_DURATION.redirectCookie)
  );
}

/**
 * Récupère et supprime l'URL de redirection
 */
export async function getAndClearRedirectUrl(): Promise<string | null> {
  const cookieStore = await cookies();
  const redirectTo = cookieStore.get(COOKIE_NAMES.REDIRECT_TO)?.value || null;

  if (redirectTo) {
    cookieStore.delete(COOKIE_NAMES.REDIRECT_TO);
  }

  return redirectTo;
}
