import { cookies } from "next/headers";
import { getFranceConnectConfig } from "./franceconnect.config";
import {
  COOKIE_NAMES,
  ROLES,
  AUTH_METHODS,
  ERROR_CODES,
} from "../../core/auth.constants";
import {
  createAuthError,
  FC_ERROR_MESSAGES,
  ErrorCode,
  FC_ERROR_MAPPING,
} from "../../core/auth.errors";
import {
  getCookieOptions,
  SESSION_DURATION,
} from "../../config/session.config";
import { createToken } from "../../utils/jwt.utils";
import {
  generateSecureRandomString,
  parseJSONorJWT,
} from "../../utils/franceconnect.utils";
import { createSessionCookies } from "../../services/session.service";
import type {
  FranceConnectTokenResponse,
  FranceConnectUserInfo,
  FranceConnectError,
} from "./franceconnect.types";
import type { AuthUser, JWTPayload } from "../../core/auth.types";

/**
 * Génère l'URL d'autorisation FranceConnect
 */
export async function generateAuthorizationUrl(): Promise<string> {
  const config = getFranceConnectConfig();
  const state = generateSecureRandomString(32);
  const nonce = generateSecureRandomString(32);

  // Stocker state et nonce dans des cookies sécurisés
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAMES.FC_STATE, state, getCookieOptions(300)); // 5 min
  cookieStore.set(COOKIE_NAMES.FC_NONCE, nonce, getCookieOptions(300));

  // Construire l'URL avec les paramètres
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
    throw createAuthError.franceConnectError(
      error.error_description || "Échec de l'échange du code"
    );
  }

  return response.json();
}

/**
 * Récupère les informations utilisateur
 */
export async function getUserInfo(
  accessToken: string
): Promise<FranceConnectUserInfo> {
  const config = getFranceConnectConfig();

  const response = await fetch(config.urls.userinfo, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw createAuthError.franceConnectError(
      "Impossible de récupérer les informations utilisateur"
    );
  }

  return parseJSONorJWT<FranceConnectUserInfo>(response);
}

/**
 * Vérifie le state pour éviter les attaques CSRF
 */
export async function verifyState(state: string): Promise<boolean> {
  const cookieStore = await cookies();
  const storedState = cookieStore.get(COOKIE_NAMES.FC_STATE)?.value;

  // Supprimer le cookie après vérification
  cookieStore.delete(COOKIE_NAMES.FC_STATE);

  return storedState === state;
}

/**
 * Récupère le nonce stocké
 */
export async function getStoredNonce(): Promise<string | null> {
  const cookieStore = await cookies();
  const nonce = cookieStore.get(COOKIE_NAMES.FC_NONCE)?.value || null;

  // Supprimer le cookie après récupération
  if (nonce) {
    cookieStore.delete(COOKIE_NAMES.FC_NONCE);
  }

  return nonce;
}

/**
 * Crée une session FranceConnect
 */
export async function createFranceConnectSession(
  userInfo: FranceConnectUserInfo,
  idToken: string
): Promise<void> {
  // Créer l'objet utilisateur
  const user: AuthUser = {
    role: ROLES.PARTICULIER,
    authMethod: AUTH_METHODS.FRANCECONNECT,
    loginTime: new Date().toISOString(),
    fcSub: userInfo.sub,
    firstName: userInfo.given_name,
    lastName: userInfo.family_name,
    email: userInfo.email,
    fcIdToken: idToken, // Pour la déconnexion
  };

  // Créer le payload JWT
  const payload: JWTPayload = {
    user,
    exp: Date.now() + SESSION_DURATION.particulier * 1000,
    iat: Date.now(),
  };

  // Créer le token
  const token = createToken(payload);

  // Sauvegarder les cookies de session
  await createSessionCookies(token, user);
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
  state: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Vérifier le state
    const isValidState = await verifyState(state);
    if (!isValidState) {
      return { success: false, error: "État de sécurité invalide" };
    }

    // 2. Échanger le code contre les tokens
    const tokens = await exchangeCodeForTokens(code);

    // 3. Récupérer les infos utilisateur
    const userInfo = await getUserInfo(tokens.access_token);
    console.log("UserInfo FranceConnect:", userInfo);

    // 4. Créer la session
    await createFranceConnectSession(userInfo, tokens.id_token);

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
  // Logger l'erreur complète pour debug
  console.error("[FranceConnect Error]", {
    error,
    description: errorDescription,
    timestamp: new Date().toISOString(),
  });

  // Mapper l'erreur FranceConnect vers notre code d'erreur
  const errorCode = FC_ERROR_MAPPING[error] || ERROR_CODES.FRANCECONNECT_ERROR;

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
