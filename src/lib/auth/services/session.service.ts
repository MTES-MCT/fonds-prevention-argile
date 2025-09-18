import { cookies } from "next/headers";
import { COOKIE_NAMES, ROLES } from "../core/auth.constants";
import { SESSION_DURATION, getCookieOptions } from "../config/session.config";
import type { UserRole } from "../core/auth.types";

export async function createSessionCookies(
  token: string,
  role: string
): Promise<void> {
  const cookieStore = await cookies();

  // Déterminer la durée selon le rôle
  const maxAge =
    role === ROLES.ADMIN
      ? SESSION_DURATION.admin
      : SESSION_DURATION.particulier;

  cookieStore.set(COOKIE_NAMES.SESSION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });

  // Cookie pour le rôle (pour le middleware)
  cookieStore.set(COOKIE_NAMES.SESSION_ROLE, role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });
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
