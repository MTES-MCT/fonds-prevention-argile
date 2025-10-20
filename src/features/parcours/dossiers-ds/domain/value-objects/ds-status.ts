import { Status } from "@/features/parcours/core/domain/value-objects/status";

/**
 * Statuts Démarches Simplifiées
 */
export enum DSStatus {
  EN_CONSTRUCTION = "en_construction",
  EN_INSTRUCTION = "en_instruction",
  ACCEPTE = "accepte",
  REFUSE = "refuse",
  CLASSE_SANS_SUITE = "classe_sans_suite",
  NON_ACCESSIBLE = "non_accessible", // État custom pour dossier non trouvé
}

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

/**
 * Type dérivé des statuts DS
 */
export type DSStatusType = `${DSStatus}`;

/**
 * Vérifie si le dossier DS est finalisé
 */
export function isDSFinalized(status: DSStatus): boolean {
  return [
    DSStatus.ACCEPTE,
    DSStatus.REFUSE,
    DSStatus.CLASSE_SANS_SUITE,
  ].includes(status);
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
