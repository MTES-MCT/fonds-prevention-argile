import { cookies } from "next/headers";
import { getFranceConnectConfig } from "./franceconnect.config";
import { createToken, decodeToken } from "../../utils/jwt.utils";
import type {
  FranceConnectTokenResponse,
  FranceConnectUserInfo,
  FranceConnectError,
} from "./franceconnect.types";
import {
  generateSecureRandomString,
  parseJSONorJWT,
} from "./franceconnect.utils";
import {
  AUTH_METHODS,
  COOKIE_NAMES,
  getCookieOptions,
  ROLES,
  SESSION_DURATION,
} from "../../domain/value-objects";
import { ERROR_CODES } from "../../domain/errors/AuthError";
import type { ErrorCode } from "../../domain/errors/AuthError";
import { JWTPayload } from "../../domain/entities";
import { getOrCreateParcours } from "@/shared/database/services";
import { userRepo } from "@/shared/database/repositories";
import {
  FC_ERROR_MAPPING,
  FC_ERROR_MESSAGES,
  createFCError,
} from "./franceconnect.errors";

/**
 * Génère l'URL d'autorisation FranceConnect
 */
export async function generateAuthorizationUrl(): Promise<string> {
  const config = getFranceConnectConfig();
  const state = generateSecureRandomString(32);
  const nonce = generateSecureRandomString(32);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAMES.FC_STATE, state, getCookieOptions(300));
  cookieStore.set(COOKIE_NAMES.FC_NONCE, nonce, getCookieOptions(300));

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    scope: config.scopes,
    state: state,
    nonce: nonce,
    acr_values: config.acrValues,
  });

  return `${config.urls.authorization}?${params.toString()}`;
}

/**
 * Échange le code d'autorisation contre les tokens
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<FranceConnectTokenResponse> {
  const config = getFranceConnectConfig();

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: code,
    redirect_uri: config.callbackUrl,
  });

  const response = await fetch(config.urls.token, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = (await response.json()) as FranceConnectError;
    throw createFCError.general(
      error.error_description || "Échec de l'échange du code"
    );
  }

  return response.json();
}

/**
 * Vérifie le state pour éviter les attaques CSRF
 */
export async function verifyState(state: string): Promise<boolean> {
  const cookieStore = await cookies();
  const storedState = cookieStore.get(COOKIE_NAMES.FC_STATE)?.value;

  cookieStore.delete(COOKIE_NAMES.FC_STATE);

  return storedState === state;
}

/**
 * Vérifie le nonce dans l'id_token FranceConnect
 */
export async function verifyNonce(idToken: string): Promise<boolean> {
  const decoded = decodeToken(idToken);

  if (!decoded?.nonce) {
    console.error("Pas de nonce dans l'id_token");
    return false;
  }

  const storedNonce = await getStoredNonce();

  if (!storedNonce) {
    console.error("Pas de nonce stocké");
    return false;
  }

  return decoded.nonce === storedNonce;
}

/**
 * Récupère le nonce stocké
 */
export async function getStoredNonce(): Promise<string | null> {
  const cookieStore = await cookies();
  const nonce = cookieStore.get(COOKIE_NAMES.FC_NONCE)?.value || null;

  if (nonce) {
    cookieStore.delete(COOKIE_NAMES.FC_NONCE);
  }

  return nonce;
}

/**
 * Crée une session FranceConnect
 */
export async function createFranceConnectSession(
  userId: string,
  fcIdToken?: string,
  firstName?: string,
  lastName?: string
): Promise<void> {
  const payload: JWTPayload = {
    userId,
    role: ROLES.PARTICULIER,
    firstName,
    lastName,
    authMethod: AUTH_METHODS.FRANCECONNECT,
    fcIdToken,
    exp: Date.now() + SESSION_DURATION.particulier * 1000,
    iat: Date.now(),
  };

  const token = createToken(payload);

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAMES.SESSION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION.particulier,
    path: "/",
  });

  cookieStore.set(COOKIE_NAMES.SESSION_ROLE, ROLES.PARTICULIER, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION.particulier,
    path: "/",
  });
}

/**
 * Génère l'URL de déconnexion FranceConnect
 */
export function generateLogoutUrl(idToken: string, state?: string): string {
  const config = getFranceConnectConfig();
  const logoutState = state || generateSecureRandomString(32);

  const params = new URLSearchParams({
    id_token_hint: idToken,
    state: logoutState,
    post_logout_redirect_uri: config.postLogoutUrl,
  });

  return `${config.urls.logout}?${params.toString()}`;
}

/**
 * Traite le callback FranceConnect complet
 */
export async function handleFranceConnectCallback(
  code: string,
  state: string,
  codeInsee?: string
): Promise<{ success: boolean; error?: string; shouldLogout?: boolean }> {
  try {
    // 1. Vérifier le state
    const isValidState = await verifyState(state);
    if (!isValidState) {
      return {
        success: false,
        error: "État de sécurité invalide",
        shouldLogout: true,
      };
    }

    // 2. Échanger le code contre les tokens
    const tokens = await exchangeCodeForTokens(code);

    // 3. Vérifier le nonce dans l'id_token
    const isValidNonce = await verifyNonce(tokens.id_token);
    if (!isValidNonce) {
      return {
        success: false,
        error: "Vérification de sécurité échouée (nonce)",
        shouldLogout: true,
      };
    }

    // 4. Récupérer les infos utilisateur
    const userInfo = await getUserInfo(tokens.access_token);

    // 5. Créer ou récupérer l'utilisateur en base AVEC le code INSEE
    const user = await userRepo.upsertFromFranceConnect(userInfo, codeInsee);

    // 6. Initialiser le parcours si première connexion
    await getOrCreateParcours(user.id);

    // 7. Créer la session avec l'userId
    await createFranceConnectSession(
      user.id,
      tokens.id_token,
      userInfo.given_name,
      userInfo.family_name
    );

    return { success: true };
  } catch (error) {
    console.error("Erreur callback FranceConnect:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Gère les erreurs du callback FranceConnect
 */
export function handleFranceConnectError(
  error: string,
  errorDescription?: string
): { success: boolean; error: string; code: ErrorCode } {
  console.error("[FranceConnect Error]", {
    error,
    description: errorDescription,
    timestamp: new Date().toISOString(),
  });

  // Mapper l'erreur FC
  const errorCode: ErrorCode =
    (FC_ERROR_MAPPING[error] as ErrorCode) || ERROR_CODES.FRANCECONNECT_ERROR;

  // Récupérer le message correspondant
  const message =
    FC_ERROR_MESSAGES[errorCode] ||
    FC_ERROR_MESSAGES[ERROR_CODES.FRANCECONNECT_ERROR];

  return {
    success: false,
    error: message,
    code: errorCode,
  };
}

/**
 * Récupère les informations utilisateur (méthode privée)
 */
async function getUserInfo(
  accessToken: string
): Promise<FranceConnectUserInfo> {
  const config = getFranceConnectConfig();

  const response = await fetch(config.urls.userinfo, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw createFCError.general(
      "Impossible de récupérer les informations utilisateur"
    );
  }

  return parseJSONorJWT<FranceConnectUserInfo>(response);
}
