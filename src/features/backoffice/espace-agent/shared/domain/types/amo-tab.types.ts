/**
 * Types pour les onglets de l'espace AMO
 */

export type AmoTabId = "accueil" | "dossiers" | "statistiques";

export interface AmoTab {
  id: AmoTabId;
  label: string;
  href: string;
}
