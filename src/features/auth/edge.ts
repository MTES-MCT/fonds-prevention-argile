/**
 * Exports pour Edge Runtime (middleware)
 * Ne contient AUCUN import de modules Node.js (crypto, fs, etc.)
 */

// Types et constantes (pas de dépendances Node.js)
export * from "./domain/types";
export * from "./domain/entities";
export * from "./domain/value-objects/constants";
export * from "./domain/value-objects/configs/routes.config";
export * from "./domain/value-objects/configs/session.config";

// JWT decode uniquement (sans crypto Node.js)
export {
  decodeToken,
  isTokenExpired,
  getRoleFromToken,
} from "./utils/jwt-decode.utils";

// Helpers de validation (sans crypto Node.js)
export {
  isValidRole,
  isValidAuthMethod,
  validateSessionCookies,
} from "./utils/validation.utils";

// Services de routes (compatible Edge Runtime)
export {
  isAdminRoute,
  isParticulierRoute,
  isProtectedRoute,
  canAccessRoute,
} from "./services/routes.service";

// Services de redirections (compatible Edge Runtime)
export {
  getDefaultRedirect,
  getUnauthorizedRedirect,
  getPostLoginRedirect,
} from "./services/redirects.service";
