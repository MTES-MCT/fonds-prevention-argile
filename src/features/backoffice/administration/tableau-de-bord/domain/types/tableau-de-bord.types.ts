export interface StatAvecVariation {
  valeur: number;
  variation: number | null;
}

export interface TableauDeBordStats {
  simulationsLancees: StatAvecVariation;
  comptesCrees: StatAvecVariation;
  tauxTransformation: StatAvecVariation;
  demandesAmoEnvoyees: StatAvecVariation;
  reponsesAmoEnAttente: StatAvecVariation;
  dossiersDemarcheNumerique: StatAvecVariation;
  demandesArchivees: StatAvecVariation;
}

export type PeriodeId = "7j" | "30j" | "90j" | "6m" | "12m" | "tout";

export interface PeriodeOption {
  id: PeriodeId;
  label: string;
  jours: number | null; // null = depuis le debut
}

export const PERIODES: PeriodeOption[] = [
  { id: "7j", label: "7 derniers jours", jours: 7 },
  { id: "30j", label: "30 derniers jours", jours: 30 },
  { id: "90j", label: "90 derniers jours", jours: 90 },
  { id: "6m", label: "6 derniers mois", jours: 180 },
  { id: "12m", label: "12 derniers mois", jours: 365 },
  { id: "tout", label: "Depuis le début", jours: null },
];

export const DEFAULT_PERIODE: PeriodeId = "30j";

/** Date d'ouverture du service */
export const SERVICE_START_DATE = new Date("2025-10-16");
