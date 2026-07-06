import { UserRole } from "@/shared/domain/value-objects";

/**
 * Liste exhaustive des permissions disponibles dans le backoffice
 */
export enum BackofficePermission {
  // Statistiques
  STATS_READ = "stats:read",

  // Users tracking
  USERS_READ = "users:read",
  USERS_STATS_READ = "users:stats:read",
  USERS_DETAIL_READ = "users:detail:read",

  // AMO
  AMO_READ = "amo:read",
  AMO_WRITE = "amo:write",
  AMO_DELETE = "amo:delete",
  AMO_IMPORT = "amo:import",

  // Allers vers
  ALLERS_VERS_READ = "allers-vers:read",
  ALLERS_VERS_WRITE = "allers-vers:write",
  ALLERS_VERS_DELETE = "allers-vers:delete",
  ALLERS_VERS_IMPORT = "allers-vers:import",

  // Agents
  AGENTS_READ = "agents:read",
  AGENTS_WRITE = "agents:write",
  AGENTS_DELETE = "agents:delete",

  // Dossiers
  ELIGIBILITE_READ = "eligibilite:read",
  ELIGIBILITE_WRITE = "eligibilite:write",
  DIAGNOSTIC_READ = "diagnostic:read",
  DEVIS_READ = "devis:read",
  FACTURES_READ = "factures:read",

  // Dossiers AMO (permissions spécifiques pour le scope AMO)
  DOSSIERS_AMO_READ = "dossiers-amo:read",
  DOSSIERS_AMO_STATS_READ = "dossiers-amo:stats:read",

  // Espace Agent - Prospects (permissions pour les allers-vers dans l'espace agent)
  PROSPECTS_VIEW = "prospects:view",
  PROSPECTS_VIEW_DETAIL = "prospects:view-detail",
  PROSPECTS_STATS = "prospects:stats",

  // Création de dossier par un agent (AMO ou Aller-vers) pour un demandeur.
  // Distincte de PROSPECTS_* (lecture territoire AV) : un agent AMO doit pouvoir
  // créer un dossier sans pour autant accéder aux prospects de territoire AV.
  DOSSIERS_CREATE = "dossiers:create",

  // Commentaires internes sur les parcours
  COMMENTAIRES_CREATE = "commentaires:create",
  COMMENTAIRES_READ = "commentaires:read",
  COMMENTAIRES_UPDATE_OWN = "commentaires:update-own",
  COMMENTAIRES_DELETE_OWN = "commentaires:delete-own",
  COMMENTAIRES_READ_ALL = "commentaires:read-all", // Pour admins uniquement
}

/**
 * Permissions par rôle (RBAC)
 */
export const ROLE_PERMISSIONS: Record<string, BackofficePermission[]> = {
  [UserRole.SUPER_ADMINISTRATEUR]: [
    // Accès total - toutes les permissions
    ...Object.values(BackofficePermission),
  ],

  [UserRole.ADMINISTRATEUR]: [
    // Accès total sauf gestion des agents
    BackofficePermission.STATS_READ,
    BackofficePermission.USERS_READ,
    BackofficePermission.USERS_STATS_READ,
    BackofficePermission.USERS_DETAIL_READ,
    BackofficePermission.AMO_READ,
    BackofficePermission.AMO_WRITE,
    BackofficePermission.AMO_DELETE,
    BackofficePermission.AMO_IMPORT,
    BackofficePermission.ALLERS_VERS_READ,
    BackofficePermission.ALLERS_VERS_WRITE,
    BackofficePermission.ALLERS_VERS_DELETE,
    BackofficePermission.ALLERS_VERS_IMPORT,
    BackofficePermission.ELIGIBILITE_READ,
    BackofficePermission.ELIGIBILITE_WRITE,
    BackofficePermission.DIAGNOSTIC_READ,
    BackofficePermission.DEVIS_READ,
    BackofficePermission.FACTURES_READ,
    BackofficePermission.DOSSIERS_AMO_READ,
    BackofficePermission.DOSSIERS_AMO_STATS_READ,
    // Commentaires : lecture seule pour tous les commentaires
    BackofficePermission.COMMENTAIRES_READ_ALL,
  ],

  [UserRole.ANALYSTE]: [
    // Lecture seule : stats, users stats, AMO, allers-vers
    BackofficePermission.STATS_READ,
    BackofficePermission.USERS_STATS_READ,
    BackofficePermission.AMO_READ,
    BackofficePermission.ALLERS_VERS_READ,
    // Suivi DDT : peut ajouter/lire/éditer ses messages sur les dossiers de son
    // territoire, mais ne gère pas l'éligibilité (pas d'ELIGIBILITE_WRITE) ni la
    // création de dossier (pas de DOSSIERS_CREATE).
    BackofficePermission.COMMENTAIRES_CREATE,
    BackofficePermission.COMMENTAIRES_READ,
    BackofficePermission.COMMENTAIRES_UPDATE_OWN,
    BackofficePermission.COMMENTAIRES_DELETE_OWN,
  ],

  [UserRole.AMO]: [
    // Statistiques NATIONALES ouvertes aux agents (agrégats non nominatifs +
    // demandeurs anonymisés). Le scope DOSSIERS reste l'entreprise ; seul le scope
    // STATS est national (ADR-0017). USERS_STATS_READ ne donne QUE la vue agrégée
    // (pas USERS_READ/USERS_DETAIL_READ, donc pas la liste nominative).
    BackofficePermission.STATS_READ,
    BackofficePermission.USERS_STATS_READ,
    // Accès limité : dossiers de son entreprise AMO uniquement (lecture seule)
    BackofficePermission.DOSSIERS_AMO_READ,
    BackofficePermission.DOSSIERS_AMO_STATS_READ,
    // Création de dossier (parcours d'invitation au nom d'un demandeur)
    BackofficePermission.DOSSIERS_CREATE,
    // Commentaires : lecture/écriture sur les dossiers accessibles
    BackofficePermission.COMMENTAIRES_CREATE,
    BackofficePermission.COMMENTAIRES_READ,
    BackofficePermission.COMMENTAIRES_UPDATE_OWN,
    BackofficePermission.COMMENTAIRES_DELETE_OWN,
  ],

  [UserRole.ALLERS_VERS]: [
    // Statistiques NATIONALES ouvertes aux agents (agrégats + demandeurs anonymisés,
    // ADR-0017). Le scope DOSSIERS reste territorial ; seul le scope STATS est national.
    BackofficePermission.STATS_READ,
    BackofficePermission.USERS_STATS_READ,
    // Accès aux prospects de son territoire uniquement
    BackofficePermission.PROSPECTS_VIEW,
    BackofficePermission.PROSPECTS_VIEW_DETAIL,
    BackofficePermission.PROSPECTS_STATS,
    // Création de dossier (parcours d'invitation au nom d'un demandeur)
    BackofficePermission.DOSSIERS_CREATE,
    // Commentaires : lecture/écriture sur les prospects accessibles
    BackofficePermission.COMMENTAIRES_CREATE,
    BackofficePermission.COMMENTAIRES_READ,
    BackofficePermission.COMMENTAIRES_UPDATE_OWN,
    BackofficePermission.COMMENTAIRES_DELETE_OWN,
  ],

  [UserRole.AMO_ET_ALLERS_VERS]: [
    // Statistiques NATIONALES ouvertes aux agents (agrégats + demandeurs anonymisés,
    // ADR-0017). Scope DOSSIERS = union entreprise + territoire ; scope STATS national.
    BackofficePermission.STATS_READ,
    BackofficePermission.USERS_STATS_READ,
    // Combinaison des permissions AMO + Allers-Vers
    BackofficePermission.DOSSIERS_AMO_READ,
    BackofficePermission.DOSSIERS_AMO_STATS_READ,
    BackofficePermission.PROSPECTS_VIEW,
    BackofficePermission.PROSPECTS_VIEW_DETAIL,
    BackofficePermission.PROSPECTS_STATS,
    // Création de dossier (parcours d'invitation au nom d'un demandeur)
    BackofficePermission.DOSSIERS_CREATE,
    // Commentaires : lecture/écriture sur tous les dossiers/prospects accessibles
    BackofficePermission.COMMENTAIRES_CREATE,
    BackofficePermission.COMMENTAIRES_READ,
    BackofficePermission.COMMENTAIRES_UPDATE_OWN,
    BackofficePermission.COMMENTAIRES_DELETE_OWN,
  ],
};

/**
 * Onglets du backoffice et leurs permissions requises
 */
export const TAB_PERMISSIONS: Record<string, BackofficePermission[]> = {
  statistiques: [BackofficePermission.STATS_READ],
  users: [BackofficePermission.USERS_STATS_READ],
  amo: [BackofficePermission.AMO_READ],
  "allers-vers": [BackofficePermission.ALLERS_VERS_READ],
  agents: [BackofficePermission.AGENTS_READ],
  eligibilite: [BackofficePermission.ELIGIBILITE_READ],
  diagnostic: [BackofficePermission.DIAGNOSTIC_READ],
  devis: [BackofficePermission.DEVIS_READ],
  factures: [BackofficePermission.FACTURES_READ],
  // Onglets spécifiques pour l'espace agent
  "dossiers-amo": [BackofficePermission.DOSSIERS_AMO_READ],
  prospects: [BackofficePermission.PROSPECTS_VIEW],
};
