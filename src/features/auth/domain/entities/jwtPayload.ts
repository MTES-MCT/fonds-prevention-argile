/**
 * Payload JWT
 */
export interface JWTPayload {
  userId: string; // UUID de l'utilisateur en base
  role: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  authMethod: string;
  idToken?: string;
  // acr ProConnect vérifié au callback : sans valeur MFA, la session agent est refusée.
  proConnectAcr?: string;
  exp: number;
  iat: number;
}
