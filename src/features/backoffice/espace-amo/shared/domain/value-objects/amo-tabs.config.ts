import type { AmoTab, AmoTabId } from "../types/amo-tab.types";

/**
 * Configuration des onglets de l'espace AMO
 */
export const AMO_TABS: AmoTab[] = [
  {
    id: "accueil",
    label: "Accueil",
    href: "/espace-amo",
  },
  {
    id: "dossiers",
    label: "Dossiers",
    href: "/espace-amo/dossiers",
  },
  {
    id: "statistiques",
    label: "Statistiques",
    href: "/espace-amo/statistiques",
  },
];

/**
 * Onglet par défaut - Premier onglet
 */
export const DEFAULT_AMO_TAB: AmoTabId = "accueil";
