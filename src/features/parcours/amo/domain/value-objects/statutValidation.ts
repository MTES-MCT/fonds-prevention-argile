/**
 * Statuts possibles pour la validation AMO
 */
export enum StatutValidationAmo {
  EN_ATTENTE = "en_attente",
  LOGEMENT_ELIGIBLE = "logement_eligible",
  LOGEMENT_NON_ELIGIBLE = "logement_non_eligible",
  ACCOMPAGNEMENT_REFUSE = "accompagnement_refuse",
}

/**
 * Type dérivé des statuts
 */
export type StatutValidationAmoType = `${StatutValidationAmo}`;

/**
 * Helper pour vérifier si un statut est final
 */
export function isValidationFinale(statut: StatutValidationAmo): boolean {
  return statut !== StatutValidationAmo.EN_ATTENTE;
}

/**
 * Helper pour vérifier si la validation est acceptée
 */
export function isValidationAcceptee(statut: StatutValidationAmo): boolean {
  return statut === StatutValidationAmo.LOGEMENT_ELIGIBLE;
}

/**
 * Helper pour vérifier si la validation est refusée
 */
export function isValidationRefusee(statut: StatutValidationAmo): boolean {
  return (
    statut === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE ||
    statut === StatutValidationAmo.ACCOMPAGNEMENT_REFUSE
  );
}
