/**
 * Types unifiés pour l'authentification
 */

// Payload JWT étendu
export interface ExtendedJWTPayload {
  user: {
    // Commun
    role: "admin" | "particulier";
    loginTime: string;

    // Admin
    authMethod: "password" | "franceconnect";

    // FranceConnect
    fcSub?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    fcIdToken?: string;
  };
  exp: number;
  iat: number;
}

// Type User pour le contexte frontend
export interface AuthUser {
  role: "admin" | "particulier";
  authMethod: "password" | "franceconnect";
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}
