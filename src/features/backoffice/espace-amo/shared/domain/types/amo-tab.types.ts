/**
 * Types pour les onglets de l'espace AMO
 */

export type AmoTabId = "demandes" | "dossiers" | "statistiques";

export interface AmoTab {
  id: AmoTabId;
  label: string;
  icon: string;
  href: string;
}
