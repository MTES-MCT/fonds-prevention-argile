import { cookies } from "next/headers";
import * as argon2 from "argon2";
import { COOKIE_NAMES, ROLES, AUTH_METHODS } from "../core/auth.constants";
import { createToken, verifyToken } from "../utils/jwt.utils";
import { clearSessionCookies } from "./session.service";
import { SESSION_DURATION } from "../config/session.config";
import { getServerEnv } from "@/lib/config/env.config";
import type { AuthUser, JWTPayload } from "../core/auth.types";

// Cache pour le hash du mot de passe (évite de recalculer)
let passwordHashCache: string | null = null;

/**
 * Récupère l'utilisateur courant avec ses infos complètes
 * Fait une requête DB si nécessaire pour les infos d'affichage
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session) return null;

  // Pour un admin, pas besoin de DB
  if (session.authMethod === AUTH_METHODS.PASSWORD) {
    return {
      id: session.userId,
      role: session.role,
      authMethod: session.authMethod,
      firstName: "Administrateur",
      loginTime: new Date().toISOString(),
    };
  }

  // Pour un utilisateur FC, on peut récupérer les infos si besoin
  // (mais en général, on n'en a pas besoin dans le MVP)
  return {
    id: session.userId,
    role: session.role,
    authMethod: session.authMethod,
    loginTime: new Date().toISOString(),
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

  if (!password || password.length < 8) {
    return { success: false, error: "Mot de passe incorrect" };
  }

  // Générer le hash du mot de passe admin
  if (!passwordHashCache) {
    passwordHashCache = await argon2.hash(adminPassword);
  }

  // Vérifier le mot de passe avec Argon2
  const isValid = await argon2.verify(passwordHashCache, password);

  if (!isValid) {
    return { success: false, error: "Mot de passe incorrect" };
  }

  // Créer la session admin avec un ID fixe pour l'admin
  await createAdminSession("admin-123");

  return { success: true };
}

/**
 * Crée une session pour un admin
 */
export async function createAdminSession(adminId: string): Promise<void> {
  const payload: JWTPayload = {
    userId: adminId,
    role: ROLES.ADMIN,
    authMethod: AUTH_METHODS.PASSWORD,
    exp: Date.now() + SESSION_DURATION.admin * 1000,
    iat: Date.now(),
  };

  const token = createToken(payload);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAMES.SESSION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION.admin,
    path: "/",
  });

  // Ajouter le cookie role pour le middleware
  cookieStore.set(COOKIE_NAMES.SESSION_ROLE, ROLES.ADMIN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION.admin,
    path: "/",
  });
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
 * Login simple (pour compatibilité avec l'ancien code)
 * @deprecated Utiliser authenticateAdmin à la place
 */
export async function login(password: string) {
  return authenticateAdmin(password);
}
