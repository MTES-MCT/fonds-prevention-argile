// Réexporter depuis le Shared Kernel
export { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";

// Importer pour utiliser dans les fonctions
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";

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
  return statut === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE || statut === StatutValidationAmo.ACCOMPAGNEMENT_REFUSE;
}
