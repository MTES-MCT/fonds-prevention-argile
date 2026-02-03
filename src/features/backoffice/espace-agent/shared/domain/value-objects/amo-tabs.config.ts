import type { AmoTab, AmoTabId } from "../types/amo-tab.types";

/**
 * Configuration des onglets pour les agents AMO
 */
export const AMO_TABS: AmoTab[] = [
  {
    id: "demandes",
    label: "Demandes",
    href: "/espace-agent/demandes",
  },
  {
    id: "dossiers",
    label: "Dossiers",
    href: "/espace-agent/dossiers",
  },
  {
    id: "statistiques",
    label: "Statistiques",
    href: "/espace-agent/statistiques",
  },
];

/**
 * Configuration des onglets pour les agents Allers-Vers
 */
export const ALLERS_VERS_TABS: AmoTab[] = [
  {
    id: "prospects",
    label: "Prospects",
    href: "/espace-agent/prospects",
  },
  {
    id: "statistiques",
    label: "Statistiques",
    href: "/espace-agent/statistiques",
  },
];

/**
 * Configuration des onglets pour les agents AMO et Allers-Vers (rôle double)
 */
export const AMO_ET_ALLERS_VERS_TABS: AmoTab[] = [
  {
    id: "demandes",
    label: "Demandes",
    href: "/espace-agent/demandes",
  },
  {
    id: "dossiers",
    label: "Dossiers",
    href: "/espace-agent/dossiers",
  },
  {
    id: "prospects",
    label: "Prospects",
    href: "/espace-agent/prospects",
  },
  {
    id: "statistiques",
    label: "Statistiques",
    href: "/espace-agent/statistiques",
  },
];

/**
 * Onglet par défaut - Premier onglet
 */
export const DEFAULT_AMO_TAB: AmoTabId = "demandes";
