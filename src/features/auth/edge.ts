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

// Services compatibles Edge Runtime (pas de crypto Node.js)
export * from "./services/authorization.service";

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
