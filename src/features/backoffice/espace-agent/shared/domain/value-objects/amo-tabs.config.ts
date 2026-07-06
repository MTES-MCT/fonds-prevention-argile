import type { AmoTab, AmoTabId } from "../types/amo-tab.types";

/**
 * Configuration unifiée des onglets de l'espace agent (tous rôles métier).
 */
export const AGENT_TABS: AmoTab[] = [
  {
    id: "dossiers",
    label: "Dossiers",
    href: "/espace-agent/dossiers",
  },
];

/** @deprecated remplacé par AGENT_TABS — gardé temporairement pour AmoContext. */
export const AMO_TABS: AmoTab[] = AGENT_TABS;

/**
 * Onglet par défaut
 */
export const DEFAULT_AMO_TAB: AmoTabId = "dossiers";
