/**
 * Utilisateur authentifié
 */
export interface AuthUser {
  id: string;
  role: string;
  authMethod: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  loginTime: string;
  agentId?: string;
  entrepriseAmoId?: string;
}
