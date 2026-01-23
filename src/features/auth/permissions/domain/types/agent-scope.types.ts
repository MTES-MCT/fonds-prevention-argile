/**
 * Scope de données d'un agent
 * Définit le périmètre d'accès aux données
 */
export interface AgentScope {
  /** L'agent a-t-il un accès national (tous les dossiers) ? */
  isNational: boolean;

  /** IDs des entreprises AMO auxquelles l'agent est rattaché */
  entrepriseAmoIds: string[];

  /** Codes des départements auxquels l'agent a accès */
  departements: string[];

  /** Codes des EPCI auxquels l'agent a accès (pour les allers-vers, phase future) */
  epcis: string[];

  /** L'agent peut-il voir tous les dossiers sans restriction ? */
  canViewAllDossiers: boolean;

  /** L'agent peut-il voir les dossiers par entreprise AMO ? */
  canViewDossiersByEntreprise: boolean;

  /** L'agent peut-il voir les dossiers sans AMO (allers-vers, phase future) ? */
  canViewDossiersWithoutAmo: boolean;
}

/**
 * Informations minimales de l'agent pour calculer le scope
 */
export interface AgentScopeInput {
  id: string;
  role: string;
  entrepriseAmoId: string | null;
}

/**
 * Résultat de la vérification d'accès à un dossier
 */
export interface DossierAccessCheck {
  /** L'agent a-t-il accès au dossier ? */
  hasAccess: boolean;
  /** Raison du refus (si hasAccess = false) */
  reason?: string;
}

/**
 * Filtres de scope pour les requêtes de données
 * Utilisé par les services pour filtrer les résultats selon le scope de l'utilisateur
 */
export interface ScopeFilters {
  /** Si défini, filtrer par ces IDs d'entreprises AMO */
  entrepriseAmoIds?: string[];

  /** Si défini, filtrer par ces codes de départements */
  departements?: string[];

  /** Si true, exclure les dossiers qui ont déjà une AMO */
  excludeWithAmo?: boolean;

  /** Si true, aucun résultat ne doit être retourné (accès refusé) */
  noAccess?: boolean;
}
