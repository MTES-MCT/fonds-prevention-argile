import { cookies } from "next/headers";
import {
  getFranceConnectConfig,
  generateSecureRandomString,
  FC_COOKIES,
  getSecureCookieOptions,
} from "../config/franceconnect.config";
import { createToken } from "./simpleAuth";
import type {
  FranceConnectTokenResponse,
  FranceConnectUserInfo,
  FranceConnectError,
} from "../types/franceconnect.types";
import type { ExtendedJWTPayload } from "./auth.types";

/**
 * Génère l'URL d'autorisation FranceConnect
 */
export async function generateAuthorizationUrl(): Promise<string> {
  const config = getFranceConnectConfig();
  const state = generateSecureRandomString(32);
  const nonce = generateSecureRandomString(32);

  // Stocker state et nonce dans des cookies sécurisés
  const cookieStore = await cookies();
  cookieStore.set(FC_COOKIES.STATE, state, getSecureCookieOptions());
  cookieStore.set(FC_COOKIES.NONCE, nonce, getSecureCookieOptions());

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
    throw new Error(error.error_description || "Échec de l'échange du code");
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
    throw new Error("Impossible de récupérer les informations utilisateur");
  }

  const contentType = response.headers.get("content-type");

  // Si c'est du JSON standard
  if (contentType?.includes("application/json")) {
    return response.json();
  }

  // Si c'est un JWT (application/jwt ou text/plain avec JWT)
  const responseText = await response.text();

  // Vérification plus robuste d'un JWT
  const jwtRegex = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

  if (jwtRegex.test(responseText)) {
    // Décoder le JWT payload (sans vérifier la signature)
    try {
      const [, payload] = responseText.split(".");
      return JSON.parse(Buffer.from(payload, "base64url").toString());
    } catch (error) {
      throw new Error("Impossible de décoder le JWT UserInfo");
    }
  }

  // Tenter de parser comme JSON par défaut
  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error(
      `Format de réponse UserInfo non reconnu: ${responseText.substring(0, 50)}...`
    );
  }
}

/**
 * Vérifie le state pour éviter les attaques CSRF
 */
export async function verifyState(state: string): Promise<boolean> {
  const cookieStore = await cookies();
  const storedState = cookieStore.get(FC_COOKIES.STATE)?.value;

  // Supprimer le cookie après vérification
  cookieStore.delete(FC_COOKIES.STATE);

  return storedState === state;
}

/**
 * Récupère le nonce stocké
 */
export async function getStoredNonce(): Promise<string | null> {
  const cookieStore = await cookies();
  const nonce = cookieStore.get(FC_COOKIES.NONCE)?.value || null;

  // Supprimer le cookie après récupération
  if (nonce) {
    cookieStore.delete(FC_COOKIES.NONCE);
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
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  const payload: ExtendedJWTPayload = {
    user: {
      role: "particulier",
      authMethod: "franceconnect",
      loginTime: new Date().toISOString(),
      fcSub: userInfo.sub,
      firstName: userInfo.given_name,
      lastName: userInfo.family_name,
      email: userInfo.email,
      fcIdToken: idToken, // Pour la déconnexion
    },
    exp: expires.getTime(),
    iat: Date.now(),
  };

  const token = createToken(payload);

  // Sauvegarder la session et les cookies
  const cookieStore = await cookies();

  // Cookie principal avec le JWT
  cookieStore.set("session", token, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  // Cookies pour éviter le décodage JWT dans le middleware
  cookieStore.set("session_role", "particulier", {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  cookieStore.set("session_auth", "franceconnect", {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
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
