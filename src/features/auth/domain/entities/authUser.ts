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
  allersVersId?: string;
  /** Capacités d'accès backoffice pour la navigation unifiée (ADR-0015), calculées côté serveur. */
  canAccessAdministration?: boolean;
  canAccessEspaceAgent?: boolean;
}
