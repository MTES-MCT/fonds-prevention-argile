import { cookies } from "next/headers";
import { verifyToken } from "../utils/jwt.utils";
import { COOKIE_NAMES, ROLES } from "../domain/value-objects/constants";
import {
  getCookieOptions,
  SESSION_DURATION,
} from "../domain/value-objects/configs/session.config";
import type { JWTPayload } from "../domain/entities";
import type { UserRole } from "../domain/types";

/**
 * Service de gestion des sessions
 */

/**
 * Récupère la session courante
 */
export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAMES.SESSION)?.value;

  if (!token) return null;

  return verifyToken(token);
}

/**
 * Vérifie si l'utilisateur est authentifié
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

/**
 * Vérifie si l'utilisateur a un rôle spécifique
 */
export async function hasRole(role: string): Promise<boolean> {
  const session = await getSession();
  return session?.role === role;
}

/**
 * Crée les cookies de session
 */
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

  const cookieOptions = getCookieOptions(maxAge);

  cookieStore.set(COOKIE_NAMES.SESSION, token, cookieOptions);
  cookieStore.set(COOKIE_NAMES.SESSION_ROLE, role, cookieOptions);
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

/**
 * Déconnexion avec info sur le type d'auth
 */
export async function logout(): Promise<{
  authMethod: string | null;
  fcIdToken?: string | null;
}> {
  const session = await getSession();
  await clearSessionCookies();

  return {
    authMethod: session?.authMethod || null,
    fcIdToken: session?.fcIdToken || null,
  };
}
