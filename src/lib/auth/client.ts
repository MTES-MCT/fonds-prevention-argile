/**
 * Exports pour les composants client uniquement
 */

// Types et constantes
export * from "./core/auth.types";
export * from "./core/auth.constants";

// Context et hooks
export { AuthProvider, useAuth } from "./contexts/AuthContext";

// Config (sans imports serveur)
export {
  DEFAULT_REDIRECTS,
  PROTECTED_ROUTES,
} from "./config/auth.routes.config";

// Mapping des erreurs FranceConnect
export { FC_ERROR_MAPPING } from "./core/auth.errors";

export {
  decodeToken,
  isTokenExpired,
  getRoleFromToken,
} from "./utils/jwt-decode.utils";

export { useLogoutMessage, useIsAdmin } from "./hooks";
