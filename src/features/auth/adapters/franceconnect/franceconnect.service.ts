import { cookies } from "next/headers";
import { getFranceConnectConfig } from "./franceconnect.config";
import { createToken, decodeToken } from "../../utils/jwt.utils";
import type { FranceConnectTokenResponse, FranceConnectUserInfo, FranceConnectError } from "./franceconnect.types";

import { AUTH_METHODS, COOKIE_NAMES, getCookieOptions, ROLES, SESSION_DURATION } from "../../domain/value-objects";
import { ERROR_CODES } from "../../domain/errors/authErrors";
import type { ErrorCode } from "../../domain/errors/authErrors";
import { JWTPayload } from "../../domain/entities";
import { userRepo, parcoursRepo } from "@/shared/database/repositories";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { FC_ERROR_MAPPING, FC_ERROR_MESSAGES, createFCError } from "./franceconnect.errors";
import { emitBrevoEvent, BREVO_EVENTS, BREVO_ATTRS } from "@/shared/email/brevo";
import { isSimulationComplete } from "@/features/simulateur/domain/rules/navigation";
import { generateSecureRandomString, parseJSONorJWT } from "../../utils/oauth.utils";

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
export async function exchangeCodeForTokens(code: string): Promise<FranceConnectTokenResponse> {
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
    throw createFCError.general(error.error_description || "Échec de l'échange du code");
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
 * Lit et supprime le cookie de claim token posé par /claim-dossier/[token].
 * Retourne undefined si absent — la connexion FC suit alors le flux normal.
 */
export async function consumeClaimToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAMES.FC_CLAIM_TOKEN)?.value;

  if (token) {
    cookieStore.delete(COOKIE_NAMES.FC_CLAIM_TOKEN);
    return token;
  }

  return undefined;
}

/**
 * Crée une session FranceConnect
 */
export async function createFranceConnectSession(
  userId: string,
  idToken?: string,
  firstName?: string,
  lastName?: string,
  email?: string
): Promise<void> {
  const payload: JWTPayload = {
    userId,
    role: ROLES.PARTICULIER,
    firstName,
    lastName,
    email,
    authMethod: AUTH_METHODS.FRANCECONNECT,
    idToken: idToken,
    exp: Date.now() + SESSION_DURATION.particulier * 1000,
    iat: Date.now(),
  };

  const token = createToken(payload);
  const cookieStore = await cookies();
  const cookieOptions = getCookieOptions(SESSION_DURATION.particulier);

  cookieStore.set(COOKIE_NAMES.SESSION, token, cookieOptions);
  cookieStore.set(COOKIE_NAMES.SESSION_ROLE, ROLES.PARTICULIER, cookieOptions);
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
 *
 * @param code - Code d'autorisation OIDC
 * @param state - State CSRF
 * @param options.partnerSource - Slug partenaire (ex: "maif") lu depuis le cookie `partner_source`
 *   posé sur la page /connexion. Sauvegardé sur le user à la création (Phase B partner tracking).
 */
export async function handleFranceConnectCallback(
  code: string,
  state: string,
  options?: { partnerSource?: string | null }
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

    // 4bis. Consommer le claim token s'il existe (dossier pré-créé par un AV)
    const claimToken = await consumeClaimToken();

    // 5. Créer ou récupérer l'utilisateur en base
    // - partnerSource : sauvegardé à la création (et backfillé si absent), pas écrasé sur les login suivants.
    // - claimToken : si présent, rattache le user stub pré-créé par un agent AV au compte FC.
    const user = await userRepo.upsertFromFranceConnect(userInfo, {
      partnerSource: options?.partnerSource ?? null,
      claimToken,
    });

    // 6. Initialiser le parcours. `created` vient d'un insert atomique (onConflictDoNothing),
    //    fiable même sur deux callbacks concurrents — évite un double évènement Brevo.
    const { parcours, created } = await parcoursRepo.findOrCreateForUser(user.id);

    // 6bis. Si parcours en INVITATION (dossier pré-créé par un agent) → valider
    if (parcours.currentStep === Step.INVITATION) {
      // Si l'agent a fait une simulation complète (parcours "avec simulation"),
      // on la promeut comme simulation canonique du parcours pour que le
      // demandeur n'ait pas à la refaire. Pour le parcours "sans simulation"
      // (données minimales : seulement l'adresse), on laisse `rgaSimulationData`
      // null → l'écran "Éligibilité manquante" invite le demandeur à la remplir.
      if (
        !parcours.rgaSimulationData &&
        parcours.rgaSimulationDataAgent &&
        isSimulationComplete(parcours.rgaSimulationDataAgent)
      ) {
        await parcoursRepo.updateRGAData(parcours.id, parcours.rgaSimulationDataAgent);
      }
      await parcoursRepo.validateInvitation(parcours.id);
    }

    // 6ter. Synchro Brevo (flux) : évènement d'inscription à la première création
    //       du parcours. Best-effort — n'échoue jamais la connexion.
    if (created) {
      // A_AMO=false explicite : connu à la création (pas d'AMO), et posé ici plutôt
      // qu'en base pour ne pas écraser un A_AMO=true ultérieur (amo_reponse).
      await emitBrevoEvent(parcours.id, BREVO_EVENTS.DEMANDEUR_CREE, {
        attributes: { [BREVO_ATTRS.A_AMO]: false },
      });
    }

    // 7. Créer la session avec l'userId
    await createFranceConnectSession(
      user.id,
      tokens.id_token,
      userInfo.given_name,
      userInfo.preferred_username || userInfo.family_name,
      userInfo.email
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
  const errorCode: ErrorCode = (FC_ERROR_MAPPING[error] as ErrorCode) || ERROR_CODES.FRANCECONNECT_ERROR;

  // Récupérer le message correspondant
  const message = FC_ERROR_MESSAGES[errorCode] || FC_ERROR_MESSAGES[ERROR_CODES.FRANCECONNECT_ERROR];

  return {
    success: false,
    error: message,
    code: errorCode,
  };
}

/**
 * Récupère les informations utilisateur (méthode privée)
 */
async function getUserInfo(accessToken: string): Promise<FranceConnectUserInfo> {
  const config = getFranceConnectConfig();

  const response = await fetch(config.urls.userinfo, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw createFCError.general("Impossible de récupérer les informations utilisateur");
  }

  return parseJSONorJWT<FranceConnectUserInfo>(response);
}
