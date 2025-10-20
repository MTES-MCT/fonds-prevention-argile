import { AuthError, ERROR_CODES } from "../../domain/errors/AuthError";
import type { ErrorCode } from "../../domain/errors/AuthError";

/**
 * Messages d'erreur FranceConnect
 */
export const FC_ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.FRANCECONNECT_ERROR]:
    "Erreur lors de la connexion avec FranceConnect",
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
 * Helpers pour créer des erreurs FranceConnect
 */
export const createFCError = {
  general: (message?: string) =>
    new AuthError(
      ERROR_CODES.FRANCECONNECT_ERROR,
      message || FC_ERROR_MESSAGES[ERROR_CODES.FRANCECONNECT_ERROR],
      500
    ),
  cancelled: () =>
    new AuthError(
      ERROR_CODES.FC_CANCELLED,
      FC_ERROR_MESSAGES[ERROR_CODES.FC_CANCELLED],
      400
    ),
  serverError: () =>
    new AuthError(
      ERROR_CODES.FC_SERVER_ERROR,
      FC_ERROR_MESSAGES[ERROR_CODES.FC_SERVER_ERROR],
      503
    ),
  invalidState: () =>
    new AuthError(
      ERROR_CODES.FC_INVALID_STATE,
      FC_ERROR_MESSAGES[ERROR_CODES.FC_INVALID_STATE],
      400
    ),
  tokenError: () =>
    new AuthError(
      ERROR_CODES.FC_TOKEN_ERROR,
      FC_ERROR_MESSAGES[ERROR_CODES.FC_TOKEN_ERROR],
      500
    ),
  authFailed: () =>
    new AuthError(
      ERROR_CODES.FC_AUTH_FAILED,
      FC_ERROR_MESSAGES[ERROR_CODES.FC_AUTH_FAILED],
      401
    ),
  missingParams: () =>
    new AuthError(
      ERROR_CODES.FC_MISSING_PARAMS,
      FC_ERROR_MESSAGES[ERROR_CODES.FC_MISSING_PARAMS],
      400
    ),
  invalidRequest: () =>
    new AuthError(
      ERROR_CODES.FC_INVALID_REQUEST,
      FC_ERROR_MESSAGES[ERROR_CODES.FC_INVALID_REQUEST],
      400
    ),
  unauthorized: () =>
    new AuthError(
      ERROR_CODES.FC_UNAUTHORIZED,
      FC_ERROR_MESSAGES[ERROR_CODES.FC_UNAUTHORIZED],
      401
    ),
};

/**
 * Mapping des erreurs OAuth FranceConnect vers nos codes
 */
export const FC_ERROR_MAPPING: Record<string, ErrorCode> = {
  access_denied: ERROR_CODES.FC_CANCELLED,
  server_error: ERROR_CODES.FC_SERVER_ERROR,
  temporarily_unavailable: ERROR_CODES.FC_SERVER_ERROR,
  invalid_request: ERROR_CODES.FC_INVALID_REQUEST,
  unauthorized_client: ERROR_CODES.FC_UNAUTHORIZED,
  invalid_state: ERROR_CODES.FC_INVALID_STATE,
};
