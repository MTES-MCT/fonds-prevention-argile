import { ERROR_CODES } from "./auth.constants";

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Messages d'erreur par défaut
 */
export const FC_ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ERROR_CODES.UNAUTHORIZED]: "Vous n'êtes pas autorisé à accéder à cette page",
  [ERROR_CODES.SESSION_EXPIRED]:
    "Votre session a expiré, veuillez vous reconnecter",
  [ERROR_CODES.INVALID_CREDENTIALS]: "Identifiants invalides",
  [ERROR_CODES.FRANCECONNECT_ERROR]:
    "Erreur lors de la connexion avec FranceConnect",
  [ERROR_CODES.INVALID_STATE]: "État de sécurité invalide",
  [ERROR_CODES.USER_NOT_FOUND]: "Utilisateur non trouvé",
  [ERROR_CODES.ROLE_MISMATCH]: "Votre rôle ne correspond pas à cette section",
  [ERROR_CODES.LOGOUT_ERROR]: "Erreur lors de la déconnexion",
  [ERROR_CODES.INVALID_SESSION]: "Session invalide",
  [ERROR_CODES.INVALID_TOKEN]: "Token invalide",

  // Messages FranceConnect
  [ERROR_CODES.FC_CANCELLED]: "Connexion FranceConnect annulée",
  [ERROR_CODES.FC_SERVER_ERROR]: "FranceConnect temporairement indisponible",
  [ERROR_CODES.FC_INVALID_STATE]: "État de sécurité invalide",
  [ERROR_CODES.FC_TOKEN_ERROR]: "Erreur lors de l'échange de token",
  [ERROR_CODES.FC_AUTH_FAILED]: "Échec de l'authentification FranceConnect",
  [ERROR_CODES.FC_MISSING_PARAMS]: "Paramètres FranceConnect manquants",
  [ERROR_CODES.FC_INVALID_REQUEST]: "Requête FranceConnect invalide",
  [ERROR_CODES.FC_UNAUTHORIZED]: "Client FranceConnect non autorisé",
};

/**
 * Classe d'erreur simple pour l'authentification
 */
export class AuthError extends Error {
  constructor(
    public code: ErrorCode,
    message?: string,
    public statusCode: number = 401
  ) {
    super(message || FC_ERROR_MESSAGES[code] || "Une erreur est survenue");
    this.name = "AuthError";
  }
}

/**
 * Helpers simplifiés pour créer des erreurs
 */
export const createAuthError = {
  unauthorized: () => new AuthError(ERROR_CODES.UNAUTHORIZED),
  sessionExpired: () => new AuthError(ERROR_CODES.SESSION_EXPIRED),
  invalidCredentials: () => new AuthError(ERROR_CODES.INVALID_CREDENTIALS),
  franceConnectError: (message?: string) =>
    new AuthError(ERROR_CODES.FRANCECONNECT_ERROR, message, 500),
  fcCancelled: () => new AuthError(ERROR_CODES.FC_CANCELLED, undefined, 400),
  fcServerError: () =>
    new AuthError(ERROR_CODES.FC_SERVER_ERROR, undefined, 503),
  roleMismatch: () => new AuthError(ERROR_CODES.ROLE_MISMATCH, undefined, 403),
};

/**
 * Mapping des erreurs FranceConnect
 */
export const FC_ERROR_MAPPING: Record<string, ErrorCode> = {
  access_denied: ERROR_CODES.FC_CANCELLED,
  server_error: ERROR_CODES.FC_SERVER_ERROR,
  temporarily_unavailable: ERROR_CODES.FC_SERVER_ERROR,
  invalid_request: ERROR_CODES.FRANCECONNECT_ERROR,
  unauthorized_client: ERROR_CODES.FRANCECONNECT_ERROR,
};
