import { cookies } from "next/headers";
import { getProConnectConfig } from "./proconnect.config";
import { createToken, decodeToken } from "../../utils/jwt.utils";
import type {
  ProConnectTokenResponse,
  ProConnectUserInfo,
  ProConnectError,
  ProConnectCallbackResult,
} from "./proconnect.types";
import { validateProConnectUserInfo, sanitizeProConnectUserInfo } from "./proconnect.utils";
import { AUTH_METHODS, COOKIE_NAMES, getCookieOptions, SESSION_DURATION } from "../../domain/value-objects";
import { ERROR_CODES } from "../../domain/errors/authErrors";
import type { ErrorCode } from "../../domain/errors/authErrors";
import { JWTPayload } from "../../domain/entities";
import { agentsRepo } from "@/shared/database/repositories";
import { PC_ERROR_MAPPING, PC_USER_ERROR_MESSAGES, createPCError } from "./proconnect.errors";
import { generateSecureRandomString, parseJSONorJWT } from "../../utils/oauth.utils";
import { AgentRole } from "@/shared/domain/value-objects";

/**
 * Génère l'URL d'autorisation ProConnect
 */
export async function generateAuthorizationUrl(): Promise<string> {
  const config = getProConnectConfig();
  const state = generateSecureRandomString(32);
  const nonce = generateSecureRandomString(32);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAMES.PC_STATE, state, getCookieOptions(300));
  cookieStore.set(COOKIE_NAMES.PC_NONCE, nonce, getCookieOptions(300));

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
export async function exchangeCodeForTokens(code: string): Promise<ProConnectTokenResponse> {
  const config = getProConnectConfig();

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
    const error = (await response.json()) as ProConnectError;
    throw createPCError.tokenExchange(error.error_description || "Échec de l'échange du code");
  }

  return response.json();
}

/**
 * Vérifie le state pour éviter les attaques CSRF
 */
export async function verifyState(state: string): Promise<boolean> {
  const cookieStore = await cookies();
  const storedState = cookieStore.get(COOKIE_NAMES.PC_STATE)?.value;

  console.log("🔐 [PC State] Verification:", {
    hasStoredState: !!storedState,
    hasReceivedState: !!state,
    match: storedState === state,
    storedPreview: storedState?.substring(0, 10) + "...",
    receivedPreview: state?.substring(0, 10) + "...",
  });

  if (!storedState || !state) {
    return false;
  }

  if (storedState !== state) {
    return false;
  }

  // Supprimer le cookie après vérification
  cookieStore.delete(COOKIE_NAMES.PC_STATE);

  return true;
}

/**
 * Vérifie le nonce dans l'id_token ProConnect
 */
export async function verifyNonce(idToken: string): Promise<boolean> {
  const decoded = decodeToken(idToken);

  if (!decoded?.nonce) {
    console.error("[ProConnect] Pas de nonce dans l'id_token");
    return false;
  }

  const storedNonce = await getStoredNonce();

  if (!storedNonce) {
    console.error("[ProConnect] Pas de nonce stocké");
    return false;
  }

  return decoded.nonce === storedNonce;
}

/**
 * Récupère le nonce stocké
 */
export async function getStoredNonce(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const nonce = cookieStore.get(COOKIE_NAMES.PC_NONCE)?.value || undefined;

  if (nonce) {
    cookieStore.delete(COOKIE_NAMES.PC_NONCE);
  }

  return nonce;
}

/**
 * Crée une session ProConnect pour un agent
 */
export async function createProConnectSession(
  agentId: string,
  agentRole: AgentRole,
  pcIdToken?: string,
  firstName?: string,
  lastName?: string
): Promise<void> {
  const payload: JWTPayload = {
    userId: agentId,
    role: agentRole,
    firstName,
    lastName,
    authMethod: AUTH_METHODS.PROCONNECT,
    idToken: pcIdToken,
    exp: Date.now() + SESSION_DURATION.admin * 1000,
    iat: Date.now(),
  };

  const token = createToken(payload);
  const cookieStore = await cookies();
  const cookieOptions = getCookieOptions(SESSION_DURATION.admin);

  cookieStore.set(COOKIE_NAMES.SESSION, token, cookieOptions);
  cookieStore.set(COOKIE_NAMES.SESSION_ROLE, agentRole, cookieOptions);
  cookieStore.set(COOKIE_NAMES.SESSION_AUTH, AUTH_METHODS.PROCONNECT, cookieOptions);
}

/**
 * Génère l'URL de déconnexion ProConnect
 */
export function generateLogoutUrl(idToken: string, state?: string): string {
  const config = getProConnectConfig();
  const logoutState = state || generateSecureRandomString(32);

  const params = new URLSearchParams({
    id_token_hint: idToken,
    state: logoutState,
    post_logout_redirect_uri: config.postLogoutUrl,
  });

  return `${config.urls.logout}?${params.toString()}`;
}

/**
 * Traite le callback ProConnect complet
 */
export async function handleProConnectCallback(code: string, state: string): Promise<ProConnectCallbackResult> {
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

    // 🔍 DEBUG : Voir exactement ce que ProConnect renvoie
    console.log("📦 [PC UserInfo] Données reçues:", {
      sub: userInfo.sub,
      email: userInfo.email,
      given_name: userInfo.given_name,
      usual_name: userInfo.usual_name,
      uid: userInfo.uid,
      siret: userInfo.siret,
      phone: userInfo.phone,
      organizational_unit: userInfo.organizational_unit,
      // Afficher tous les champs reçus
      raw_keys: Object.keys(userInfo),
    });

    // 5. Valider les données obligatoires
    if (!validateProConnectUserInfo(userInfo)) {
      return {
        success: false,
        error: "Données ProConnect incomplètes",
        shouldLogout: true,
      };
    }

    // 6. Nettoyer les données
    const sanitizedUserInfo = sanitizeProConnectUserInfo(userInfo);

    // 7. Créer ou récupérer l'agent en base
    const agent = await agentsRepo.upsertFromProConnect({
      sub: sanitizedUserInfo.sub,
      email: sanitizedUserInfo.email,
      given_name: sanitizedUserInfo.given_name,
      usual_name: sanitizedUserInfo.usual_name,
      uid: sanitizedUserInfo.uid,
      siret: sanitizedUserInfo.siret,
      phone: sanitizedUserInfo.phone,
      organizational_unit: sanitizedUserInfo.organizational_unit,
    });

    // 8. Créer la session avec l'agentId et son rôle
    await createProConnectSession(agent.id, agent.role, tokens.id_token, agent.givenName, agent.usualName || "");

    return { success: true };
  } catch (error) {
    console.error("[ProConnect] Erreur callback:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Gère les erreurs du callback ProConnect
 */
export function handleProConnectError(
  error: string,
  errorDescription?: string
): { success: boolean; error: string; code: ErrorCode } {
  console.error("[ProConnect Error]", {
    error,
    description: errorDescription,
    timestamp: new Date().toISOString(),
  });

  // Mapper l'erreur PC
  const errorCode: ErrorCode = (PC_ERROR_MAPPING[error] as ErrorCode) || ERROR_CODES.PROCONNECT_ERROR;

  // Récupérer le message correspondant avec fallback
  const message =
    PC_USER_ERROR_MESSAGES[errorCode] ||
    PC_USER_ERROR_MESSAGES[ERROR_CODES.PROCONNECT_ERROR] ||
    "Une erreur est survenue lors de la connexion ProConnect";

  return {
    success: false,
    error: message,
    code: errorCode,
  };
}

/**
 * Récupère les informations utilisateur (méthode privée)
 */
async function getUserInfo(accessToken: string): Promise<ProConnectUserInfo> {
  const config = getProConnectConfig();

  const response = await fetch(config.urls.userinfo, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw createPCError.userInfo("Impossible de récupérer les informations utilisateur");
  }

  return parseJSONorJWT<ProConnectUserInfo>(response);
}
