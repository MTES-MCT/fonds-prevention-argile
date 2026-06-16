import type { Step } from "@/shared/domain/value-objects/step.enum";
import type { Status } from "@/shared/domain/value-objects/status.enum";
import type { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";

/**
 * Types d'anomalie détectables EN BASE (sans appel à Démarches Simplifiées), pour le listing
 * de la vue de diagnostic super-admin. Le cross-check DS live (taxonomie fine `DsAnomalyType`)
 * n'intervient que sur le détail d'un parcours.
 */
export enum ParcoursAnomalyType {
  /** Dossier de l'étape courante déposé (en construction / en instruction) qui n'avance pas. */
  BLOQUE = "bloque",
  /** Parcours à une étape avancée (diagnostic+) sans dossier d'éligibilité accepté : dossier perdu. */
  ORPHELIN = "orphelin",
  /** La dernière synchronisation de ce parcours a renvoyé une erreur. */
  SYNC_ERREUR = "sync_erreur",
}

export const PARCOURS_ANOMALY_LABELS: Record<ParcoursAnomalyType, { label: string; description: string }> = {
  [ParcoursAnomalyType.BLOQUE]: {
    label: "Bloqué",
    description:
      "Le dossier de l'étape courante est déposé (en construction ou en instruction) mais le parcours n'avance pas. À croiser avec l'état réel côté DS pour distinguer une attente normale d'une désynchronisation.",
  },
  [ParcoursAnomalyType.ORPHELIN]: {
    label: "Dossier perdu",
    description:
      "Le parcours est à une étape avancée (diagnostic, devis ou factures) mais aucun dossier d'éligibilité accepté n'est rattaché en base : le dossier DS s'est désynchronisé. Recherche par email côté DS recommandée.",
  },
  [ParcoursAnomalyType.SYNC_ERREUR]: {
    label: "Sync en erreur",
    description:
      "La dernière synchronisation de ce parcours a échoué (token non instructeur, dossier introuvable, erreur API…). Voir le message d'erreur et la vue Synchronisations.",
  },
};

/** Une ligne d'anomalie (un parcours × un type d'anomalie). */
export interface AnomalyRow {
  type: ParcoursAnomalyType;
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
  /** Âge en jours (depuis la création du dossier, ou du parcours pour un orphelin). */
  ageDays: number | null;
  /** Détail libre (ex. message d'erreur de sync). */
  detail: string | null;
}

export interface AnomaliesResult {
  rows: AnomalyRow[];
  counts: Record<ParcoursAnomalyType, number>;
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
