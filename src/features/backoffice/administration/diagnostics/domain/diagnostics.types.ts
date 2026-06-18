import type { Step } from "@/shared/domain/value-objects/step.enum";
import type { Status } from "@/shared/domain/value-objects/status.enum";
import type { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";

/**
 * État de diagnostic d'un parcours actif, calculé EN BASE (sans appel DN) à partir du dossier
 * de son étape COURANTE + l'historique de sync. Un parcours = un état (priorité aux anomalies).
 * Permet de piloter tous les cas via un filtre unique.
 */
export enum DiagnosticState {
  // --- Anomalies (prioritaires sur l'état du dossier) ---
  /** Sync en erreur sur un dossier déposé mais jamais instruit : dossier DN probablement expiré/supprimé. */
  SYNC_ERREUR_DEPOSE = "sync_erreur_depose",
  /** La dernière synchronisation a renvoyé une erreur (hors cas « déposé non instruit »). */
  SYNC_ERREUR = "sync_erreur",
  /** Étape avancée (diagnostic+) sans dossier d'éligibilité accepté : dossier perdu. */
  ORPHELIN = "orphelin",
  /** Dossier avec un numéro DN mais jamais synchronisé (last_sync_at null). */
  JAMAIS_SYNCHRONISE = "jamais_synchronise",
  /** Déposé depuis plus du seuil sans avoir été pris en instruction : ne bouge plus. */
  BLOQUE = "bloque",
  // --- États normaux du dossier de l'étape courante ---
  /** Dossier créé mais jamais déposé par l'usager (brouillon). */
  BROUILLON = "brouillon",
  /** Déposé récemment, en attente de prise en instruction (normal). */
  DEPOSE_EN_ATTENTE = "depose_en_attente",
  /** En cours d'instruction par la DDT (normal). */
  EN_INSTRUCTION = "en_instruction",
  /** Dossier de l'étape courante accepté (en attente de progression). */
  ACCEPTE = "accepte",
  /** Dossier refusé. */
  REFUSE = "refuse",
  /** Dossier classé sans suite. */
  CLASSE_SANS_SUITE = "classe_sans_suite",
  /** Étape courante sans dossier (étape "à faire" avant création — normal). */
  SANS_DOSSIER = "sans_dossier",
}

export type DiagnosticSeverity = "error" | "warning" | "info" | "success";

/** Seuil (en jours) au-delà duquel un dossier déposé non instruit est considéré « bloqué ». */
export const SEUIL_BLOQUE_JOURS = 30;

export const DIAGNOSTIC_STATE_META: Record<
  DiagnosticState,
  { label: string; description: string; severity: DiagnosticSeverity }
> = {
  [DiagnosticState.SYNC_ERREUR_DEPOSE]: {
    label: "Sync erreur (déposé non instruit)",
    description:
      "Dépôt confirmé par une sync (last_sync_at) mais jamais pris en instruction, et la synchro échoue désormais : le dossier DN a probablement expiré ou été supprimé. L'usager doit recréer un dossier.",
    severity: "error",
  },
  [DiagnosticState.SYNC_ERREUR]: {
    label: "Sync erreur (autre)",
    description:
      "Synchro échouée sur un dossier jamais confirmé côté DN (prefill jamais complété / brouillon), token non instructeur, ou dossier déjà instruit. À investiguer.",
    severity: "error",
  },
  [DiagnosticState.ORPHELIN]: {
    label: "Dossier perdu",
    description:
      "Parcours à une étape avancée sans dossier d'éligibilité accepté rattaché : désynchronisation parcours ↔ DN. Recherche par email recommandée (voir le détail).",
    severity: "error",
  },
  [DiagnosticState.JAMAIS_SYNCHRONISE]: {
    label: "Jamais synchronisé",
    description: "Le dossier a un numéro DN mais n'a jamais été synchronisé (aucun last_sync_at).",
    severity: "warning",
  },
  [DiagnosticState.BLOQUE]: {
    label: "Bloqué",
    description: `Dossier déposé depuis plus de ${SEUIL_BLOQUE_JOURS} jours sans avoir été pris en instruction par la DDT : il ne bouge plus.`,
    severity: "warning",
  },
  [DiagnosticState.BROUILLON]: {
    label: "Brouillon",
    description: "Dossier créé mais jamais déposé par l'usager (drop-off). Comportement normal.",
    severity: "info",
  },
  [DiagnosticState.DEPOSE_EN_ATTENTE]: {
    label: "Déposé (en attente)",
    description: `Déposé depuis moins de ${SEUIL_BLOQUE_JOURS} jours, en attente de prise en instruction. Normal.`,
    severity: "info",
  },
  [DiagnosticState.EN_INSTRUCTION]: {
    label: "En instruction",
    description: "En cours d'instruction par la DDT. Normal.",
    severity: "info",
  },
  [DiagnosticState.ACCEPTE]: {
    label: "Accepté",
    description: "Dossier de l'étape courante accepté. Le parcours devrait progresser à la prochaine sync.",
    severity: "success",
  },
  [DiagnosticState.REFUSE]: {
    label: "Refusé",
    description: "Dossier refusé par la DDT.",
    severity: "warning",
  },
  [DiagnosticState.CLASSE_SANS_SUITE]: {
    label: "Classé sans suite",
    description: "Dossier classé sans suite par la DDT.",
    severity: "info",
  },
  [DiagnosticState.SANS_DOSSIER]: {
    label: "Sans dossier",
    description: "Étape courante « à faire » sans dossier DN encore créé. Normal en début d'étape.",
    severity: "info",
  },
};

/** Ordre d'affichage des filtres : anomalies d'abord, puis états normaux. */
export const DIAGNOSTIC_STATE_ORDER: DiagnosticState[] = [
  DiagnosticState.SYNC_ERREUR_DEPOSE,
  DiagnosticState.SYNC_ERREUR,
  DiagnosticState.ORPHELIN,
  DiagnosticState.JAMAIS_SYNCHRONISE,
  DiagnosticState.BLOQUE,
  DiagnosticState.BROUILLON,
  DiagnosticState.DEPOSE_EN_ATTENTE,
  DiagnosticState.EN_INSTRUCTION,
  DiagnosticState.ACCEPTE,
  DiagnosticState.REFUSE,
  DiagnosticState.CLASSE_SANS_SUITE,
  DiagnosticState.SANS_DOSSIER,
];

/** Une ligne de diagnostic (un parcours actif). */
export interface DiagnosticRow {
  state: DiagnosticState;
  parcoursId: string;
  userId: string;
  userNom: string | null;
  userPrenom: string | null;
  userEmail: string | null;
  currentStep: Step;
  currentStatus: Status;
  dsNumber: string | null;
  dsStatus: DSStatus | null;
  submittedAt: Date | null;
  lastSyncAt: Date | null;
  /** Âge en jours depuis la date pertinente pour l'état (dépôt, création…). */
  ageDays: number | null;
  detail: string | null;
}

export interface DiagnosticsResult {
  rows: DiagnosticRow[];
  counts: Record<DiagnosticState, number>;
  total: number;
  generatedAt: string;
}

/** État de santé d'une démarche Démarches Numériques (DN). */
export enum DemarcheSanteStatus {
  /** Démarche publiée : les usagers peuvent déposer. */
  PUBLIEE = "publiee",
  /** Démarche existante mais non publiée (brouillon / close) → blocage dépôt usager. */
  NON_PUBLIEE = "non_publiee",
  /** Démarche pas (encore) créée côté DN (ex. devis/factures non encore ouvertes). */
  NON_DISPONIBLE = "non_disponible",
  /** Aucune démarche configurée côté app pour cette étape. */
  NON_CONFIGUREE = "non_configuree",
  /** Erreur API lors du contrôle. */
  ERREUR = "erreur",
}

/** Santé d'une démarche DN (cross-check live léger : existe ? publiée ?). */
export interface DemarcheSante {
  step: Step;
  demarcheNumber: number | null;
  title: string | null;
  state: string | null;
  status: DemarcheSanteStatus;
  errorDetail: string | null;
}
