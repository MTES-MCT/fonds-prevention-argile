/**
 * Payload JWT
 */
export interface JWTPayload {
  userId: string; // UUID de l'utilisateur en base
  role: string;
  firstName?: string;
  lastName?: string;
  authMethod: string;
  fcIdToken?: string;
  exp: number;
  iat: number;
}
