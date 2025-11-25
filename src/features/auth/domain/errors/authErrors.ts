import { AUTH_ERROR_CODES } from "../value-objects/constants";
import { FC_ERROR_CODES } from "../../adapters/franceconnect/franceconnect.constants";
import { PC_ERROR_CODES } from "../../adapters/proconnect/proconnect.constants";

export const ERROR_CODES = {
  ...AUTH_ERROR_CODES,
  ...FC_ERROR_CODES,
  ...PC_ERROR_CODES,
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Classe d'erreur pour l'authentification
 */
export class AuthError extends Error {
  constructor(
    public code: ErrorCode,
    message?: string,
    public statusCode: number = 401
  ) {
    super(message || "Une erreur est survenue");
    this.name = "AuthError";
  }
}

/**
 * Messages d'erreur auth génériques
 */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.UNAUTHORIZED]: "Vous n'êtes pas autorisé à accéder à cette page",
  [ERROR_CODES.SESSION_EXPIRED]: "Votre session a expiré, veuillez vous reconnecter",
  [ERROR_CODES.INVALID_CREDENTIALS]: "Identifiants invalides",
  [ERROR_CODES.USER_NOT_FOUND]: "Utilisateur non trouvé",
  [ERROR_CODES.ROLE_MISMATCH]: "Votre rôle ne correspond pas à cette section",
  [ERROR_CODES.LOGOUT_ERROR]: "Erreur lors de la déconnexion",
  [ERROR_CODES.INVALID_SESSION]: "Session invalide",
  [ERROR_CODES.INVALID_TOKEN]: "Token invalide",
  [ERROR_CODES.INVALID_STATE]: "État de sécurité invalide",
  [ERROR_CODES.INVALID_NONCE]: "Vérification de sécurité échouée",
  [ERROR_CODES.TOKEN_EXCHANGE_FAILED]: "Échec de l'échange du code d'autorisation",
  [ERROR_CODES.USERINFO_FAILED]: "Impossible de récupérer les informations utilisateur",
  [ERROR_CODES.UNKNOWN_ERROR]: "Une erreur inconnue est survenue",
  [ERROR_CODES.PROCONNECT_ERROR]: "Erreur ProConnect",
  [ERROR_CODES.PROCONNECT_CANCELLED]: "Connexion ProConnect annulée",
};

/**
 * Helpers pour créer des erreurs auth génériques
 */
export const createAuthError = {
  unauthorized: () => new AuthError(ERROR_CODES.UNAUTHORIZED),
  sessionExpired: () => new AuthError(ERROR_CODES.SESSION_EXPIRED),
  invalidCredentials: () => new AuthError(ERROR_CODES.INVALID_CREDENTIALS),
  roleMismatch: () => new AuthError(ERROR_CODES.ROLE_MISMATCH, undefined, 403),
  userNotFound: () => new AuthError(ERROR_CODES.USER_NOT_FOUND, undefined, 404),
  invalidSession: () => new AuthError(ERROR_CODES.INVALID_SESSION),
  invalidToken: () => new AuthError(ERROR_CODES.INVALID_TOKEN),
  invalidState: () => new AuthError(ERROR_CODES.INVALID_STATE),
  invalidNonce: () => new AuthError(ERROR_CODES.INVALID_NONCE),
  proConnectError: () => new AuthError(ERROR_CODES.PROCONNECT_ERROR),
  proConnectCancelled: () => new AuthError(ERROR_CODES.PROCONNECT_CANCELLED),
};
