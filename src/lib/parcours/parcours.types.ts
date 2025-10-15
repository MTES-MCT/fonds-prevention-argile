import {
  DossierDemarchesSimplifiees,
  ParcoursPrevention,
} from "../database/schema";

/**
 * Étapes du parcours de prévention RGA
 */
export enum Step {
  CHOIX_AMO = "CHOIX_AMO",
  ELIGIBILITE = "ELIGIBILITE",
  DIAGNOSTIC = "DIAGNOSTIC",
  DEVIS = "DEVIS",
  FACTURES = "FACTURES",
}

/**
 * Statuts internes de validation
 */
export enum Status {
  TODO = "TODO",
  EN_INSTRUCTION = "EN_INSTRUCTION",
  VALIDE = "VALIDE",
}

// Pour tracker où on en est dans le parcours
export interface ParcoursState {
  step: Step;
  status: Status;
}

// Ordre des étapes
export const STEP_ORDER = [
  Step.CHOIX_AMO,
  Step.ELIGIBILITE,
  Step.DIAGNOSTIC,
  Step.DEVIS,
  Step.FACTURES,
] as const;

/**
 * Vérifie si stepA est avant stepB dans le parcours
 */
export const isStepBefore = (stepA: Step, stepB: Step): boolean => {
  return STEP_ORDER.indexOf(stepA) < STEP_ORDER.indexOf(stepB);
};

/**
 * Vérifie si stepA est après stepB dans le parcours
 * @param stepA
 * @param stepB
 * @returns
 */
export const isStepAfter = (stepA: Step, stepB: Step): boolean => {
  return STEP_ORDER.indexOf(stepA) > STEP_ORDER.indexOf(stepB);
};

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
 * Résultat complet du parcours d'un utilisateur
 */
export interface ParcoursComplet {
  parcours: ParcoursPrevention;
  dossiers: DossierDemarchesSimplifiees[];
  isComplete: boolean;
  prochainEtape: Step | null;
}

/**
 * Informations de session utilisateur
 */
export interface SessionInfo {
  session?: {
    userId: string;
    role: string;
    expiresAt: string;
  };
}
