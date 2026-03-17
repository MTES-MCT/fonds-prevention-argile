import { UserRole } from "@/shared/domain/value-objects";

export interface AdminNavTab {
  id: string;
  label: string;
  href: string;
  icon: string;
  /** Rôles minimum requis pour voir l'onglet. Si absent, visible par tous les rôles ayant accès au backoffice. */
  minRoles?: UserRole[];
}

/**
 * Onglets de navigation horizontale pour l'administration
 */
export const ADMIN_NAV_TABS: AdminNavTab[] = [
  {
    id: "tableau-de-bord",
    label: "Tableau de bord",
    href: "/administration",
    icon: "fr-icon-dashboard-3-line",
  },
  {
    id: "acquisition",
    label: "Acquisition",
    href: "/administration/acquisition",
    icon: "fr-icon-line-chart-line",
  },
  {
    id: "demandeurs",
    label: "Demandeurs",
    href: "/administration/demandeurs",
    icon: "fr-icon-user-fill",
  },
  {
    id: "gestion-agents",
    label: "Gestion des agents",
    href: "/administration/gestion-agents",
    icon: "fr-icon-team-fill",
    minRoles: [UserRole.SUPER_ADMINISTRATEUR],
  },
  {
    id: "gestion-amo",
    label: "Gestion des AMO",
    href: "/administration/gestion-amo",
    icon: "fr-icon-building-fill",
    minRoles: [UserRole.SUPER_ADMINISTRATEUR, UserRole.ADMINISTRATEUR],
  },
  {
    id: "gestion-allers-vers",
    label: "Gestion des Allers Vers",
    href: "/administration/gestion-allers-vers",
    icon: "fr-icon-road-map-line",
    minRoles: [UserRole.SUPER_ADMINISTRATEUR, UserRole.ADMINISTRATEUR],
  },
];
