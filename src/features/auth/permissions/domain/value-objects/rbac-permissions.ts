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
  ],

  [UserRole.ANALYSTE]: [
    // Lecture seule : stats, users, AMO, allers-vers
    BackofficePermission.STATS_READ,
    BackofficePermission.USERS_STATS_READ,
    BackofficePermission.AMO_READ,
    BackofficePermission.ALLERS_VERS_READ,
  ],

  [UserRole.AMO]: [
    // Accès limité pour les AMO (à définir selon besoins)
  ],
};

/**
 * Onglets du backoffice et leurs permissions requises
 */
export const TAB_PERMISSIONS: Record<string, BackofficePermission[]> = {
  statistiques: [BackofficePermission.STATS_READ],
  users: [BackofficePermission.USERS_STATS_READ], // Accès aux stats des users = accès à l'onglet
  amo: [BackofficePermission.AMO_READ],
  "allers-vers": [BackofficePermission.ALLERS_VERS_READ],
  agents: [BackofficePermission.AGENTS_READ],
  eligibilite: [BackofficePermission.ELIGIBILITE_READ],
  diagnostic: [BackofficePermission.DIAGNOSTIC_READ],
  devis: [BackofficePermission.DEVIS_READ],
  factures: [BackofficePermission.FACTURES_READ],
};
