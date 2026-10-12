// Réexporter depuis le Shared Kernel
export { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";

// Importer pour utiliser dans les fonctions
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import type { DossierState } from "../../adapters/graphql/types";

/**
 * Labels français des statuts Démarches Simplifiées (pour affichage)
 */
export const DS_STATUS_LABELS: Record<DSStatus, string> = {
  [DSStatus.EN_CONSTRUCTION]: "En construction",
  [DSStatus.EN_INSTRUCTION]: "En instruction",
  [DSStatus.ACCEPTE]: "Accepté",
  [DSStatus.REFUSE]: "Refusé",
  [DSStatus.CLASSE_SANS_SUITE]: "Classé sans suite",
  [DSStatus.NON_ACCESSIBLE]: "Non accessible",
} as const;

/**
 * Mapping des statuts DS vers les statuts internes du parcours
 */
export const DS_TO_INTERNAL_STATUS: Record<DSStatus, Status> = {
  [DSStatus.EN_CONSTRUCTION]: Status.TODO,
  [DSStatus.EN_INSTRUCTION]: Status.EN_INSTRUCTION,
  [DSStatus.ACCEPTE]: Status.VALIDE,
  [DSStatus.REFUSE]: Status.EN_INSTRUCTION,
  [DSStatus.CLASSE_SANS_SUITE]: Status.EN_INSTRUCTION,
  [DSStatus.NON_ACCESSIBLE]: Status.TODO,
} as const;

// DN nomme `sans_suite` ce que l'enum Postgres `ds_status` nomme `classe_sans_suite`.
const ETAT_DN_TO_DS_STATUS: Record<DossierState, DSStatus> = {
  en_construction: DSStatus.EN_CONSTRUCTION,
  en_instruction: DSStatus.EN_INSTRUCTION,
  accepte: DSStatus.ACCEPTE,
  refuse: DSStatus.REFUSE,
  sans_suite: DSStatus.CLASSE_SANS_SUITE,
};

/** Traduit l'état renvoyé par l'API GraphQL DN ; `null` pour un état que DN aurait ajouté depuis. */
export function dsStatusFromEtatDn(etat: string): DSStatus | null {
  return Object.hasOwn(ETAT_DN_TO_DS_STATUS, etat) ? ETAT_DN_TO_DS_STATUS[etat as DossierState] : null;
}

/**
 * Type dérivé des statuts DS
 */
export type DSStatusType = `${DSStatus}`;

/**
 * Vérifie si le dossier DS est finalisé
 */
export function isDSFinalized(status: DSStatus): boolean {
  return [DSStatus.ACCEPTE, DSStatus.REFUSE, DSStatus.CLASSE_SANS_SUITE].includes(status);
}

/**
 * Vérifie si le dossier DS est accepté
 */
export function isDSAccepted(status: DSStatus): boolean {
  return status === DSStatus.ACCEPTE;
}

/**
 * Vérifie si le dossier DS est en cours
 */
export function isDSInProgress(status: DSStatus): boolean {
  return [DSStatus.EN_CONSTRUCTION, DSStatus.EN_INSTRUCTION].includes(status);
}

/**
 * Vérifie si le dossier DS est refusé
 */
export function isDSRejected(status: DSStatus): boolean {
  return status === DSStatus.REFUSE || status === DSStatus.CLASSE_SANS_SUITE;
}
