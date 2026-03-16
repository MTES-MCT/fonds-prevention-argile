export interface AdminNavTab {
  id: string;
  label: string;
  href: string;
  icon: string;
}

/**
 * Onglets de navigation horizontale pour les super-administrateurs
 */
export const SUPER_ADMIN_NAV_TABS: AdminNavTab[] = [
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
    id: "gestion-utilisateurs",
    label: "Gestion utilisateurs",
    href: "/administration/gestion-utilisateurs",
    icon: "fr-icon-team-fill",
  },
];
