export * from "./core/auth.types";
export * from "./core/auth.constants";
export {
  AuthError,
  createAuthError,
  FC_ERROR_MAPPING,
} from "./core/auth.errors";

// Configuration
export * from "./config/auth.routes.config";
export * from "./config/session.config";

// Services principaux
export {
  getCurrentUser,
  createAdminSession,
  logout,
  isAuthenticated,
  hasRole,
} from "./services/auth.service";

export * from "./services/roles.service";
export * from "./services/session.service";

// Providers - FranceConnect
export {
  generateAuthorizationUrl,
  handleFranceConnectCallback,
  handleFranceConnectError,
  generateLogoutUrl,
  verifyState,
  getStoredNonce,
  createFranceConnectSession,
  getUserInfo,
  exchangeCodeForTokens,
} from "./providers/franceconnect/franceconnect.service";

export * from "./providers/franceconnect/franceconnect.types";

// Utilitaires
export { createToken, verifyToken } from "./utils/jwt.utils";

export {
  isValidRole,
  isValidAuthMethod,
  validateSessionCookies,
} from "./utils/validation.utils";

export { isValidEmail } from "@/lib/utils";

// FranceConnect utils
export {
  generateSecureRandomString,
  parseJSONorJWT,
  buildUrl,
} from "./utils/franceconnect.utils";

// Contexts & Hooks
export { AuthProvider, useAuth } from "./contexts/AuthContext";
export * from "./hooks";
