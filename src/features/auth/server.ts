/**
 * Exports pour les composants serveur uniquement
 * (Server Components, API Routes, Server Actions)
 */

// Types et constantes
export * from "./domain/types";
export * from "./domain/entities";
export * from "./domain/value-objects";
export * from "./domain/errors";

// Services
export * from "./services";

// Adapters FranceConnect
export * from "./adapters/franceconnect/franceconnect.service";
export * from "./adapters/franceconnect/franceconnect.config";
export * from "./adapters/franceconnect/franceconnect.types";
export * from "./adapters/franceconnect/franceconnect.errors";

// Utils (tous)
export * from "./utils/jwt.utils";
export { decodeToken as decodeTokenFromJwtDecode } from "./utils/jwt-decode.utils";
export * from "./utils/validation.utils";

// Permissions (toutes les fonctions de vérification)
export * from "./permissions";
