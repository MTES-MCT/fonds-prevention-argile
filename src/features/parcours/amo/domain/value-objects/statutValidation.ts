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

/**
 * L'AMO a statué sur l'éligibilité : validée, refusée pour inéligibilité, ou éligible sans
 * accompagnement. `EN_ATTENTE` (pas encore répondu) et `SANS_AMO` (aucun AMO au dossier, le
 * demandeur est en autonomie) n'en sont pas — d'où l'écart avec `isValidationFinale`.
 */
export function aRenduSaDecision(statut: StatutValidationAmo | null): boolean {
  return statut !== null && (isValidationAcceptee(statut) || isValidationRefusee(statut));
}

/**
 * Logement non éligible, quelle qu'en soit la source : décision d'un AMO (`statutAmo`),
 * ou dossier archivé pour inéligibilité — qualification d'un Aller-vers comme simulation
 * du demandeur (`isDossierNonEligible`). Les deux sources sont disjointes : une validation
 * AMO ne doit jamais alimenter le second terme, sans quoi une décision **positive** se
 * retourne en inéligibilité.
 * Prédicat partagé par `MaListe`, `CalloutManager`, `StepDetailAmo`, `StepDetailSimulateur`
 * et la section « Pour en savoir plus », pour qu'ils ne puissent pas diverger.
 */
export function estLogementNonEligible(statutAmo: StatutValidationAmo | null, isDossierNonEligible: boolean): boolean {
  return (
    isDossierNonEligible ||
    statutAmo === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE ||
    statutAmo === StatutValidationAmo.ACCOMPAGNEMENT_REFUSE
  );
}
