import { DSStatus } from "./ds-status";

/**
 * Taxonomie métier des anomalies d'un dossier après cross-check avec son état RÉEL côté
 * Démarches Simplifiées (DS). Source unique partagée par les scripts d'audit (`scripts/ops`)
 * et la vue de diagnostic super-admin.
 *
 * Le cross-check compare le `ds_status` qu'on a en base au `state` (ou à l'erreur) renvoyé
 * par l'API DS pour le `ds_number` stocké.
 */
export enum DsAnomalyType {
  /** Brouillon créé mais jamais déposé par l'usager (drop-off). Pas un bug. */
  JAMAIS_DEPOSE = "jamais_depose",
  /** ds_status NULL (jamais synchronisé) mais le dossier existe côté DS : une sync suffit. */
  JAMAIS_SYNCHRONISE_EXISTE = "jamais_synchronise_existe",
  /** DS diverge de notre état (plus avancé, refusé...) sans qu'on l'ait capté. */
  DESYNC = "desync",
  /** DS = accepté alors qu'on est en_instruction : à propager (recompute + moveToNextStep). */
  DESYNC_A_SYNCER = "desync_a_syncer",
  /** Déposé, en attente réelle de la décision instructeur. Normal. */
  EN_ATTENTE_INSTRUCTEUR = "en_attente_instructeur",
  /** DS est revenu en construction alors qu'on le croyait en instruction (rare). */
  REGRESSION_DS = "regression_ds",
  /** `not_found` côté DS : dossier purgé, archivé ou mauvais numéro. */
  DS_SUPPRIME = "ds_supprime",
  /** `unauthorized` côté DS : le token n'est pas instructeur de la démarche (ADR-0011). */
  DS_INACCESSIBLE = "ds_inaccessible",
  /** Autre erreur API DS (réseau, etc.). */
  DS_ERREUR = "ds_erreur",
  /** Combinaison non prévue (à investiguer). */
  INATTENDU = "inattendu",
}

export interface DsCrossCheckInput {
  /** `ds_status` local du dossier audité (étape courante). */
  localStatus: DSStatus | string | null;
  /** Résultat du cross-check DS : soit un `state`, soit une `error`. */
  ds: { state?: string; error?: string };
}

/**
 * Classe un dossier déposé / en instruction selon son statut interne et le vrai statut DS.
 * Distingue le drop-off usager (pas un bug) de la désynchronisation (bug à corriger).
 */
export function classifyDossierAnomaly({ localStatus, ds }: DsCrossCheckInput): DsAnomalyType {
  if (ds.error === "not_found") return DsAnomalyType.DS_SUPPRIME;
  if (ds.error === "unauthorized") return DsAnomalyType.DS_INACCESSIBLE;
  if (ds.error) return DsAnomalyType.DS_ERREUR;

  const s = ds.state;

  // Jamais confirmé chez nous : ds_status NULL = dossier jamais synchronisé (créé, pas de
  // statut). not_found / unauthorized sont déjà traités plus haut. S'il reste un état DS,
  // c'est que le dossier existe côté DS et qu'une simple sync recopiera l'état.
  if (!localStatus) {
    return s ? DsAnomalyType.JAMAIS_SYNCHRONISE_EXISTE : DsAnomalyType.INATTENDU;
  }

  if (localStatus === DSStatus.EN_CONSTRUCTION) {
    // On le croit en construction : si DS aussi → jamais déposé ; sinon DS a avancé.
    if (s === "en_construction") return DsAnomalyType.JAMAIS_DEPOSE;
    return DsAnomalyType.DESYNC;
  }

  // On le croit en instruction (ou autre statut "avancé").
  if (s === "accepte") return DsAnomalyType.DESYNC_A_SYNCER;
  if (s === "en_instruction") return DsAnomalyType.EN_ATTENTE_INSTRUCTEUR;
  if (s === "refuse" || s === "sans_suite") return DsAnomalyType.DESYNC;
  if (s === "en_construction") return DsAnomalyType.REGRESSION_DS;
  return DsAnomalyType.INATTENDU;
}

export interface DsAnomalyExplanation {
  /** Libellé court pour un badge. */
  label: string;
  /** Explication métier (ce qui s'est passé + quoi faire). */
  explanation: string;
  /** `true` = vraie anomalie à corriger ; `false` = comportement normal (drop-off, attente). */
  isBug: boolean;
}

export const DS_ANOMALY_EXPLANATIONS: Record<DsAnomalyType, DsAnomalyExplanation> = {
  [DsAnomalyType.JAMAIS_DEPOSE]: {
    label: "Brouillon non déposé",
    explanation:
      "L'usager a créé le dossier mais ne l'a jamais déposé sur Démarches Simplifiées. DS purge ces brouillons après environ 3 mois. Ce n'est pas un bug.",
    isBug: false,
  },
  [DsAnomalyType.JAMAIS_SYNCHRONISE_EXISTE]: {
    label: "Jamais synchronisé (existe côté DS)",
    explanation:
      "Le dossier existe côté Démarches Numériques mais n'a jamais été synchronisé chez nous (ds_status absent). Relancer une synchronisation recopie l'état réel et débloque le parcours.",
    isBug: true,
  },
  [DsAnomalyType.DESYNC]: {
    label: "Désynchronisé",
    explanation:
      "Démarches Simplifiées est dans un état différent de ce qu'on a en base. La sync n'a pas capté le changement : relancer une synchronisation.",
    isBug: true,
  },
  [DsAnomalyType.DESYNC_A_SYNCER]: {
    label: "Accepté côté DS, à propager",
    explanation:
      "Le dossier est accepté côté Démarches Simplifiées mais notre parcours ne l'a pas encore propagé. Relancer la sync : le parcours doit passer à l'étape suivante.",
    isBug: true,
  },
  [DsAnomalyType.EN_ATTENTE_INSTRUCTEUR]: {
    label: "En attente instructeur",
    explanation: "Le dossier est bien déposé et en instruction. On attend la décision de l'instructeur. Normal.",
    isBug: false,
  },
  [DsAnomalyType.REGRESSION_DS]: {
    label: "Régression DS",
    explanation:
      "Le dossier est repassé en construction côté Démarches Simplifiées alors qu'on le croyait en instruction (rare). À investiguer côté DS.",
    isBug: true,
  },
  [DsAnomalyType.DS_SUPPRIME]: {
    label: "Introuvable côté DS",
    explanation:
      "Le numéro stocké est introuvable côté Démarches Numériques (prefill jamais complété puis purgé, dossier expiré, ou numéro erroné). Voir la recherche par email ci-dessous : un dossier sous un AUTRE numéro = mismatch à relinker ; aucun dossier = drop-off (l'usager n'a rien déposé) → reset.",
    isBug: true,
  },
  [DsAnomalyType.DS_INACCESSIBLE]: {
    label: "Accès refusé (token)",
    explanation:
      "Le token de l'API n'est pas instructeur de cette démarche : la sync échoue en « unauthorized ». Vérifier les droits du token (ADR-0011, `pnpm ds:check-permissions`).",
    isBug: true,
  },
  [DsAnomalyType.DS_ERREUR]: {
    label: "Erreur API DS",
    explanation: "Une erreur API (réseau, indisponibilité) a empêché de vérifier l'état réel côté DS. Réessayer.",
    isBug: true,
  },
  [DsAnomalyType.INATTENDU]: {
    label: "Cas inattendu",
    explanation: "Combinaison de statuts non prévue. À investiguer manuellement.",
    isBug: true,
  },
};

export function explainDsAnomaly(type: DsAnomalyType): DsAnomalyExplanation {
  return DS_ANOMALY_EXPLANATIONS[type];
}
