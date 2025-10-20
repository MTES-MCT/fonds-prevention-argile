import { cookies } from "next/headers";
import * as argon2 from "argon2";
import { createToken } from "../utils/jwt.utils";
import {
  COOKIE_NAMES,
  ROLES,
  AUTH_METHODS,
} from "../domain/value-objects/constants";
import {
  getCookieOptions,
  SESSION_DURATION,
} from "../domain/value-objects/configs/session.config";
import type { JWTPayload } from "../domain/entities";
import { getServerEnv } from "@/shared/config/env.config";

// Cache pour le hash du mot de passe
let passwordHashCache: string | null = null;

/**
 * Service d'authentification admin avec mot de passe
 */

/**
 * Authentifie un admin avec mot de passe
 */
export async function authenticateAdmin(
  password: string
): Promise<{ success: boolean; error?: string }> {
  const env = getServerEnv();
  const adminPassword = env.ADMIN_PASSWORD;

  if (!password || password.length < 8) {
    return { success: false, error: "Mot de passe incorrect" };
  }

  // Générer le hash du mot de passe admin (une seule fois)
  if (!passwordHashCache) {
    passwordHashCache = await argon2.hash(adminPassword);
  }

  // Vérifier le mot de passe avec Argon2
  const isValid = await argon2.verify(passwordHashCache, password);

  if (!isValid) {
    return { success: false, error: "Mot de passe incorrect" };
  }

  // Créer la session admin
  await createAdminSession("admin-123");

  return { success: true };
}

/**
 * Crée une session admin
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
  const cookieOptions = getCookieOptions(SESSION_DURATION.admin);

  cookieStore.set(COOKIE_NAMES.SESSION, token, cookieOptions);
  cookieStore.set(COOKIE_NAMES.SESSION_ROLE, ROLES.ADMIN, cookieOptions);
}
