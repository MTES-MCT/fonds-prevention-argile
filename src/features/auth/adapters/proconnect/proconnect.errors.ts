import { ERROR_CODES, type ErrorCode } from "../../domain/errors/authErrors";
import { PC_ERROR_CODES } from "./proconnect.constants";

/**
 * Mapping des codes d'erreur ProConnect vers nos codes internes
 */
export const PC_ERROR_MAPPING: Record<string, string> = {
  [PC_ERROR_CODES.INVALID_REQUEST]: ERROR_CODES.PROCONNECT_ERROR,
  [PC_ERROR_CODES.UNAUTHORIZED_CLIENT]: ERROR_CODES.PROCONNECT_ERROR,
  [PC_ERROR_CODES.ACCESS_DENIED]: ERROR_CODES.PROCONNECT_CANCELLED,
  [PC_ERROR_CODES.UNSUPPORTED_RESPONSE_TYPE]: ERROR_CODES.PROCONNECT_ERROR,
  [PC_ERROR_CODES.INVALID_SCOPE]: ERROR_CODES.PROCONNECT_ERROR,
  [PC_ERROR_CODES.SERVER_ERROR]: ERROR_CODES.PROCONNECT_ERROR,
  [PC_ERROR_CODES.TEMPORARILY_UNAVAILABLE]: ERROR_CODES.PROCONNECT_ERROR,
  [PC_ERROR_CODES.INTERACTION_REQUIRED]: ERROR_CODES.PROCONNECT_ERROR,
  [PC_ERROR_CODES.LOGIN_REQUIRED]: ERROR_CODES.PROCONNECT_ERROR,
};

/**
 * Messages d'erreur utilisateur pour ProConnect
 */
export const PC_USER_ERROR_MESSAGES: Partial<Record<ErrorCode, string>> = {
  [ERROR_CODES.PROCONNECT_ERROR]: "Une erreur est survenue lors de la connexion ProConnect",
  [ERROR_CODES.PROCONNECT_CANCELLED]: "La connexion ProConnect a été annulée",
  [ERROR_CODES.INVALID_STATE]: "État de sécurité invalide. Veuillez réessayer.",
  [ERROR_CODES.INVALID_NONCE]: "Vérification de sécurité échouée. Veuillez réessayer.",
  [ERROR_CODES.TOKEN_EXCHANGE_FAILED]: "Impossible d'échanger le code d'autorisation",
  [ERROR_CODES.USERINFO_FAILED]: "Impossible de récupérer les informations utilisateur",
  [ERROR_CODES.UNAUTHORIZED]: "Non autorisé",
  [ERROR_CODES.SESSION_EXPIRED]: "Session expirée",
  [ERROR_CODES.INVALID_CREDENTIALS]: "Identifiants invalides",
  [ERROR_CODES.UNKNOWN_ERROR]: "Erreur inconnue",
};

/**
 * Factory pour créer des erreurs ProConnect typées
 */
export const createPCError = {
  /**
   * Erreur générique ProConnect
   */
  general: (message: string): Error => {
    return new Error(`[ProConnect] ${message}`);
  },

  /**
   * Erreur d'échange de code
   */
  tokenExchange: (description?: string): Error => {
    return new Error(`[ProConnect Token] ${description || "Échec de l'échange du code"}`);
  },

  /**
   * Erreur de récupération des infos utilisateur
   */
  userInfo: (description?: string): Error => {
    return new Error(`[ProConnect UserInfo] ${description || "Impossible de récupérer les informations utilisateur"}`);
  },

  /**
   * Erreur de validation state
   */
  invalidState: (): Error => {
    return new Error("[ProConnect] État de sécurité invalide (state)");
  },

  /**
   * Erreur de validation nonce
   */
  invalidNonce: (): Error => {
    return new Error("[ProConnect] Vérification de sécurité échouée (nonce)");
  },
};
