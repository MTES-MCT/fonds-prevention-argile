import type { AmoTab, AmoTabId } from "../types/amo-tab.types";

/**
 * Configuration des onglets de l'espace AMO
 */
export const AMO_TABS: AmoTab[] = [
  {
    id: "demandes",
    label: "Demandes en attente",
    icon: "fr-icon-mail-fill",
    href: "/espace-amo",
  },
  {
    id: "dossiers",
    label: "Dossiers suivis",
    icon: "fr-icon-folder-2-fill",
    href: "/espace-amo/dossiers",
  },
  {
    id: "statistiques",
    label: "Statistiques",
    icon: "fr-icon-bar-chart-box-fill",
    href: "/espace-amo/statistiques",
  },
];

/**
 * Onglet par défaut - Premier onglet
 */
export const DEFAULT_AMO_TAB: AmoTabId = "demandes";
