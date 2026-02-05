/**
 * Types pour les onglets de l'espace agent (AMO, Allers-Vers, etc.)
 */

export type AmoTabId = "demandes" | "dossiers" | "statistiques" | "prospects";

export interface AmoTab {
  id: AmoTabId;
  label: string;
  href: string;
}
