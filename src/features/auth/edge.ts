/**
 * Exports pour Edge Runtime (middleware)
 * Ne contient AUCUN import de modules Node.js
 */

// Types et constantes (pas de dépendances Node.js)
export * from "./core/auth.types";
export * from "./core/auth.constants";
export * from "./config/auth.routes.config";
export * from "./config/session.config";

// Services compatibles Edge Runtime
export * from "./services/roles.service";

// JWT decode uniquement (sans crypto)
export {
  decodeToken,
  isTokenExpired,
  getRoleFromToken,
} from "./utils/jwt-decode.utils";

// Helpers de validation (sans crypto)
export {
  isValidRole,
  isValidAuthMethod,
  validateSessionCookies,
} from "./utils/validation.utils";
