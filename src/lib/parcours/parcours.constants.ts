import { Step, Status, DSStatus } from "./parcours.types";

/**
 * Ordre des étapes du parcours
 */
export const STEP_ORDER: readonly Step[] = [
  Step.ELIGIBILITE,
  Step.DIAGNOSTIC,
  Step.DEVIS,
  Step.FACTURES,
] as const;

/**
 * Labels français des étapes
 */
export const STEP_LABELS: Record<Step, string> = {
  [Step.ELIGIBILITE]: "Éligibilité",
  [Step.DIAGNOSTIC]: "Diagnostic",
  [Step.DEVIS]: "Devis",
  [Step.FACTURES]: "Factures",
} as const;

/**
 * Labels français des statuts
 */
export const STATUS_LABELS: Record<Status, string> = {
  [Status.TODO]: "À faire",
  [Status.EN_INSTRUCTION]: "En instruction",
  [Status.VALIDE]: "Validé",
} as const;

/**
 * Labels français des statuts Démarches Simplifiées
 */
export const DS_STATUS_LABELS: Record<DSStatus, string> = {
  [DSStatus.EN_CONSTRUCTION]: "En construction",
  [DSStatus.EN_INSTRUCTION]: "En instruction",
  [DSStatus.ACCEPTE]: "Accepté",
  [DSStatus.REFUSE]: "Refusé",
  [DSStatus.CLASSE_SANS_SUITE]: "Classé sans suite",
  [DSStatus.NON_ACCESSIBLE]: "Non accessible", // Label pour "Non accessible" statut custom
} as const;

/**
 * Mapping des statuts DS vers les statuts internes
 */
export const DS_TO_INTERNAL_STATUS: Record<DSStatus, Status> = {
  [DSStatus.EN_CONSTRUCTION]: Status.TODO,
  [DSStatus.EN_INSTRUCTION]: Status.EN_INSTRUCTION,
  [DSStatus.ACCEPTE]: Status.VALIDE,
  [DSStatus.REFUSE]: Status.EN_INSTRUCTION,
  [DSStatus.CLASSE_SANS_SUITE]: Status.EN_INSTRUCTION,
  [DSStatus.NON_ACCESSIBLE]: Status.TODO, // Mapping pour "Non accessible"
} as const;
