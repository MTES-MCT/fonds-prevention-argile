/**
 * Types pour les onglets de l'espace agent (AMO, Allers-Vers, etc.)
 */

export type AmoTabId = "dossiers" | "experts";

export interface AmoTab {
  id: AmoTabId;
  label: string;
  href: string;
}
