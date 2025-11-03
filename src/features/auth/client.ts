/**
 * Exports pour les composants client uniquement
 */

// Types et constantes
export * from "./domain/types";
export * from "./domain/value-objects/constants";

// Entities
export * from "./domain/entities";

// Context et hooks
export { AuthProvider, useAuth } from "./contexts/AuthContext";
export * from "./hooks";

// Config routes (pour navigation)
export * from "./domain/value-objects/configs/routes.config";

// JWT decode utils (client-safe)
export {
  decodeToken,
  isTokenExpired,
  getRoleFromToken,
} from "./utils/jwt-decode.utils";

// Erreurs FC (pour affichage messages)
export {
  FC_ERROR_MESSAGES,
  FC_ERROR_MAPPING,
} from "./adapters/franceconnect/franceconnect.errors";
