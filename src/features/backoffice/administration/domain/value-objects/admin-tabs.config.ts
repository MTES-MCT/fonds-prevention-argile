import type { AdminTab, TabId } from "../types/tab.types";

export const ADMIN_TABS: AdminTab[] = [
  {
    id: "statistiques" as TabId,
    label: "Statistiques",
    icon: "fr-icon-bar-chart-box-fill",
  },
  {
    id: "users" as TabId,
    label: "Utilisateurs",
    icon: "fr-icon-user-fill",
  },
  {
    id: "agents" as TabId,
    label: "Agents",
    icon: "fr-icon-team-fill",
    superAdminOnly: true,
  },
  {
    id: "amo" as TabId,
    label: "AMO",
    icon: "fr-icon-building-fill",
    superAdminOnly: true,
  },
  {
    id: "eligibilite" as TabId,
    label: "Eligibilité",
    icon: "fr-icon-questionnaire-fill",
    superAdminOnly: true,
  },
  {
    id: "diagnostic" as TabId,
    label: "Diagnostic",
    icon: "fr-icon-survey-fill",
    superAdminOnly: true,
  },
  {
    id: "devis" as TabId,
    label: "Devis",
    icon: "fr-icon-file-text-fill",
    superAdminOnly: true,
  },
  {
    id: "factures" as TabId,
    label: "Factures",
    icon: "fr-icon-draft-fill",
    superAdminOnly: true,
  },
];
