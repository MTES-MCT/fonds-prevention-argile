/**
 * Types pour les onglets de l'espace agent (AMO, Allers-Vers, etc.)
 */

export type AmoTabId = "dossiers" | "statistiques";

export interface AmoTab {
  id: AmoTabId;
  label: string;
  href: string;
}
