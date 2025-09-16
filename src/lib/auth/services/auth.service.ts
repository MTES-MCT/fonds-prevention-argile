import { cookies } from "next/headers";
import * as argon2 from "argon2";
import { COOKIE_NAMES, ROLES, AUTH_METHODS } from "../core/auth.constants";
import { createToken, verifyToken } from "../utils/jwt.utils";
import { createSessionCookies, clearSessionCookies } from "./session.service";
import { SESSION_DURATION } from "../config/session.config";
import { getServerEnv } from "@/lib/config/env.config";
import type { AuthUser, JWTPayload } from "../core/auth.types";

// Cache pour le hash du mot de passe (évite de recalculer)
let passwordHashCache: string | null = null;

/**
 * Récupère l'utilisateur courant depuis la session
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session) return null;

  const { user } = session;

  // Format différent selon le type d'auth
  if (user.authMethod === AUTH_METHODS.FRANCECONNECT) {
    return {
      role: user.role,
      authMethod: user.authMethod,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      loginTime: user.loginTime,
    };
  }

  // Admin
  return {
    role: user.role,
    authMethod: user.authMethod,
    firstName: "Administrateur",
    email: user.email,
    loginTime: user.loginTime,
  };
}

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
 * Authentification admin avec mot de passe
 */
export async function authenticateAdmin(
  password: string
): Promise<{ success: boolean; error?: string }> {
  const env = getServerEnv();
  const adminPassword = env.ADMIN_PASSWORD;

  // Validation basique
  if (!password || password.length < 8) {
    return { success: false, error: "Mot de passe incorrect" };
  }

  // Générer le hash du mot de passe admin si pas déjà fait
  if (!passwordHashCache) {
    passwordHashCache = await argon2.hash(adminPassword);
  }

  // Vérifier le mot de passe avec Argon2
  const isValid = await argon2.verify(passwordHashCache, password);

  if (!isValid) {
    return { success: false, error: "Mot de passe incorrect" };
  }

  // Créer la session admin
  await createAdminSession();

  return { success: true };
}

/**
 * Crée une session pour un admin (après authentification réussie)
 */
export async function createAdminSession(): Promise<void> {
  const user: AuthUser = {
    role: ROLES.ADMIN,
    authMethod: AUTH_METHODS.PASSWORD,
    loginTime: new Date().toISOString(),
    firstName: "Administrateur",
  };

  const payload: JWTPayload = {
    user,
    exp: Date.now() + SESSION_DURATION.admin * 1000,
    iat: Date.now(),
  };

  const token = createToken(payload);
  await createSessionCookies(token, user);
}

/**
 * Déconnexion avec info sur le type d'auth
 */
export async function logout(): Promise<{
  authMethod: string | null;
  fcIdToken?: string | null;
}> {
  // Récupérer la session pour vérifier le type d'auth
  const session = await getSession();

  // Nettoyer les cookies
  await clearSessionCookies();

  // Retourner le type d'auth pour savoir si on doit faire un logout FranceConnect
  return {
    authMethod: session?.user.authMethod || null,
    fcIdToken: session?.user.fcIdToken || null,
  };
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
  return session?.user?.role === role;
}

/**
 * Login simple (pour compatibilité avec l'ancien code)
 * @deprecated Utiliser authenticateAdmin à la place
 */
export async function login(password: string) {
  return authenticateAdmin(password);
}
