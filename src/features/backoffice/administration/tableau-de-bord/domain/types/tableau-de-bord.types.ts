export interface StatAvecVariation {
  valeur: number;
  variation: number | null;
}

export interface AlerteTendance {
  /** Texte complet à afficher dans l'alerte */
  message: string;
  /** Liste des motifs individuels détectés */
  motifs: string[];
  /** Type de tendance (extensible) */
  type: "hausse";
}

export interface MotifArchivage {
  raison: string;
  count: number;
  /** Pourcentage par rapport au total (ex: 60 pour 60%) */
  pourcentage: number;
  /** Variation en % par rapport à la période précédente */
  variation: number | null;
}

/** Détail d'une demande archivée individuelle (pour le drawer) */
export interface DemandeArchiveeDetail {
  parcoursId: string;
  /** Prénom + nom du demandeur */
  demandeur: string;
  /** Prénom + nom de l'agent qui a archivé (null si inconnu) */
  agent: string | null;
  /** Nom de la structure AMO (null si pas d'AMO) */
  structureAmo: string | null;
  /** Date d'archivage */
  archivedAt: Date;
  /** Motif d'archivage */
  raison: string;
}

export interface MotifIneligibilite {
  /** Clé technique (ex: "appartement", "maison_trop_endommagee") */
  raison: string;
  /** Label affiché (ex: "Appartement", "Maison trop endommagée") */
  label: string;
  count: number;
  pourcentage: number;
  variation: number | null;
}

export interface DemandesIneligiblesStats {
  /** Total des raisons (>= nb parcours car un parcours peut avoir plusieurs raisons) */
  total: number;
  /** Top 5 raisons les plus fréquentes */
  motifs: MotifIneligibilite[];
  /** Raisons restantes hors top 5 */
  autresMotifs: MotifIneligibilite[];
}

export interface DemandesArchiveesStats {
  total: number;
  /** Les 5 motifs les plus fréquents */
  motifs: MotifArchivage[];
  /** Tous les motifs restants (pour le drawer "Autres") */
  autresMotifs: MotifArchivage[];
}

export interface DepartementStats {
  /** Code officiel (ex: "03") */
  codeDepartement: string;
  /** Nom du département (ex: "Allier") */
  nomDepartement: string;
  simulations: number;
  simulationsEligibles: number;
  /** Pourcentage éligibles / simulations (ex: 42) */
  pourcentageEligibles: number;
  dossiersDN: number;
  /** Dossiers DN / Simulations * 100 (ex: 31.25) */
  transformationGlobale: number;
}

export type TopDepartementsTriColumn = "simulations" | "simulationsEligibles" | "dossiersDN" | "transformationGlobale";

export interface CommuneSimulationsStats {
  /** Nom de la commune (ex: "Chateauroux") */
  commune: string;
  /** Code departement (ex: "36") */
  codeDepartement: string;
  simulations: number;
}

export interface TableauDeBordStats {
  simulationsLancees: StatAvecVariation;
  simulationsEligibles: StatAvecVariation;
  simulationsNonEligibles: StatAvecVariation;
  comptesCrees: StatAvecVariation;
  tauxTransformation: StatAvecVariation;
  demandesAmoEnvoyees: StatAvecVariation;
  reponsesAmoEnAttente: StatAvecVariation;
  dossiersDemarcheNumerique: StatAvecVariation;
  demandesArchivees: StatAvecVariation;
  alertes: AlerteTendance[];
  demandesArchiveesDetail: DemandesArchiveesStats;
  demandesIneligiblesDetail: DemandesIneligiblesStats;
  topDepartements: DepartementStats[];
  topCommunes: CommuneSimulationsStats[];
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
