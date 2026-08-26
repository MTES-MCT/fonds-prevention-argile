import type { Step } from "@/shared/domain/value-objects/step.enum";
import type { Status } from "@/shared/domain/value-objects/status.enum";
import type { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";

/**
 * État de diagnostic d'un parcours actif, calculé EN BASE (sans appel DN) à partir du dossier
 * de son étape COURANTE + l'historique de sync. Un parcours = un état (priorité aux anomalies).
 * Permet de piloter tous les cas via un filtre unique.
 */
export enum DiagnosticState {
  // --- À investiguer (vraie anomalie technique) ---
  /** Synchro en échec technique (token non instructeur, réseau…) : verdict DN unauthorized/api_error. */
  SYNC_ANOMALIE = "sync_anomalie",
  /** Dossier réellement déposé (confirmé par une sync) mais disparu côté DN ensuite. Rare. */
  DOSSIER_DEPOSE_DISPARU = "dossier_depose_disparu",
  /** Étape avancée (diagnostic+) sans dossier d'éligibilité accepté : dossier perdu. */
  ORPHELIN = "orphelin",
  /** Dossier avec un numéro DN mais jamais synchronisé (last_sync_at null). */
  JAMAIS_SYNCHRONISE = "jamais_synchronise",
  /** Déposé depuis plus du seuil sans avoir été pris en instruction : ne bouge plus. */
  BLOQUE = "bloque",
  /** Prérempli créé, jamais transmis : invisible de l'API instructeur. Normal et fréquent (ADR-0026). */
  DOSSIER_DN_NON_CREE = "dossier_dn_non_cree",
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
  [DiagnosticState.SYNC_ANOMALIE]: {
    label: "Anomalie de synchro",
    description:
      "Échec technique de la synchronisation avec Démarches Numériques (token non instructeur, accès refusé, réseau…). À investiguer.",
    severity: "error",
  },
  [DiagnosticState.DOSSIER_DEPOSE_DISPARU]: {
    label: "Dossier déposé disparu",
    description:
      "Un dossier réellement déposé (confirmé par une sync) a ensuite disparu côté DN (probablement expiré/supprimé). Rare, à vérifier.",
    severity: "warning",
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
  [DiagnosticState.DOSSIER_DN_NON_CREE]: {
    label: "Prérempli non déposé",
    description:
      "Le demandeur a cliqué « Remplir le formulaire » mais n'a pas encore transmis son dossier : DN masque un prérempli non déposé à l'API instructeur, d'où l'absence de nouvelles. État NORMAL, et non la preuve d'un dossier disparu — ne jamais supprimer sur ce seul signal (ADR-0026). Récent = peut encore aboutir ; ancien = abandon probable.",
    severity: "info",
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
  DiagnosticState.SYNC_ANOMALIE,
  DiagnosticState.DOSSIER_DEPOSE_DISPARU,
  DiagnosticState.ORPHELIN,
  DiagnosticState.JAMAIS_SYNCHRONISE,
  DiagnosticState.BLOQUE,
  // États normaux à partir d'ici : « Prérempli non déposé » n'est plus une anomalie (ADR-0026).
  DiagnosticState.DOSSIER_DN_NON_CREE,
  DiagnosticState.BROUILLON,
  DiagnosticState.DEPOSE_EN_ATTENTE,
  DiagnosticState.EN_INSTRUCTION,
  DiagnosticState.ACCEPTE,
  DiagnosticState.REFUSE,
  DiagnosticState.CLASSE_SANS_SUITE,
  DiagnosticState.SANS_DOSSIER,
];

/**
 * Verdict DN observé (issu de `dn_probe_state`, écrit par la sync) — la « vérité DN » du
 * dossier de l'étape courante, sans rappeler l'API. Voir docs SYNC-ERREURS §7.
 */
export type DnVerdict = "gone" | "exists" | "probe_error" | "unknown";

export const DN_VERDICT_META: Record<DnVerdict, { label: string; severity: DiagnosticSeverity }> = {
  gone: { label: "Disparu côté DN", severity: "error" },
  exists: { label: "Existe côté DN", severity: "success" },
  probe_error: { label: "Sondage en erreur", severity: "warning" },
  unknown: { label: "Non sondé", severity: "info" },
};

/** Dérive le verdict DN à partir de l'état brut persisté par la sync. */
export function dnVerdictOf(dnProbeState: string | null): DnVerdict {
  if (!dnProbeState) return "unknown";
  if (dnProbeState === "not_found") return "gone";
  if (dnProbeState === "unauthorized" || dnProbeState === "api_error") return "probe_error";
  return "exists"; // en_construction / en_instruction / accepte / refuse / sans_suite
}

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
  /** Verdict DN persisté (dn_probe_state) + sa fraîcheur, et le verdict dérivé. */
  dnProbeState: string | null;
  dnProbeAt: Date | null;
  dnVerdict: DnVerdict;
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

/**
 * Regroupement des verdicts de réconciliation en files de travail (ADR-0027).
 * L'écran n'expose que deux questions : qu'est-ce qui doit être rattaché, et qu'est-ce qui
 * demande un arbitrage. Le reste n'a rien à signaler.
 */
export const VERDICTS_A_RATTACHER = ["rattachement", "sans_annotation"] as const;

export const VERDICTS_A_ARBITRER = [
  "conflit_autre_parcours",
  "conflit_dossier_confirme",
  "conflit_plusieurs_deposes",
  "annotation_ambigue",
  "annotation_modifiee",
  "parcours_inconnu",
] as const;

export const VERDICT_LABELS: Record<string, { label: string; explication: string }> = {
  rattachement: {
    label: "Rattachement proposé",
    explication: "Ce dossier déposé correspond à un parcours sans dossier confirmé : il peut être rattaché.",
  },
  sans_annotation: {
    label: "Sans lien FPA",
    explication:
      "Dossier créé hors du parcours FPA (ou avant l'ajout du lien) : rien ne permet de retrouver son demandeur automatiquement. À rattacher par son numéro.",
  },
  conflit_autre_parcours: {
    label: "Numéro déjà rattaché ailleurs",
    explication: "Ce numéro appartient déjà à un autre demandeur. À vérifier avant toute action.",
  },
  conflit_dossier_confirme: {
    label: "Deux dossiers pour une étape",
    explication: "Le parcours a déjà un dossier déposé sous un autre numéro. Il faut choisir lequel fait foi.",
  },
  conflit_plusieurs_deposes: {
    label: "Plusieurs dépôts pour un parcours",
    explication: "Plusieurs dossiers déposés visent le même parcours. Un doublon côté DN, à trancher.",
  },
  annotation_ambigue: {
    label: "Lien FPA contradictoire",
    explication: "Deux annotations pointent des parcours différents : le lien a probablement été retouché.",
  },
  annotation_modifiee: {
    label: "Lien FPA modifié",
    explication: "Démarches Numériques signale que le lien prérempli a été modifié à la main : il ne fait plus foi.",
  },
  parcours_inconnu: {
    label: "Parcours introuvable",
    explication: "Le lien pointe vers un parcours qui n'existe plus.",
  },
};
