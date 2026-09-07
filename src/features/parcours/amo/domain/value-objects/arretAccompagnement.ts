import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { StatutValidationAmo } from "./statutValidation";

/**
 * Statuts depuis lesquels le demandeur peut annuler son accompagnement.
 * Une demande refusée n'est pas « annulable » : le demandeur re-choisit un AMO.
 */
const STATUTS_ANNULABLES: StatutValidationAmo[] = [
  StatutValidationAmo.EN_ATTENTE,
  StatutValidationAmo.LOGEMENT_ELIGIBLE,
];

/**
 * Le dossier est transmis et la DDT n'a pas tranché : tout changement d'accompagnement lui
 * ferait instruire un dossier menteur (SIRET/mandataire figés, non corrigeables — cf. §2.6).
 */
export function estDossierChezLaDdt(eligibiliteDsStatus: DSStatus | null): boolean {
  return eligibiliteDsStatus === DSStatus.EN_CONSTRUCTION || eligibiliteDsStatus === DSStatus.EN_INSTRUCTION;
}

/** Transmis, décision rendue ou non : plus rien n'est réinitialisable (`verifierRegeneration`). */
export function estDossierDepose(eligibiliteDsStatus: DSStatus | null): boolean {
  return (
    estDossierChezLaDdt(eligibiliteDsStatus) ||
    eligibiliteDsStatus === DSStatus.ACCEPTE ||
    eligibiliteDsStatus === DSStatus.REFUSE ||
    eligibiliteDsStatus === DSStatus.CLASSE_SANS_SUITE
  );
}

export interface EtatAnnulationAccompagnement {
  statut: StatutValidationAmo;
  /** Non-null = une demande d'arrêt est déjà en attente de réponse AMO. */
  demandeArretAt: Date | null;
  /** Statut DN du dossier d'éligibilité (null si pas encore de dossier). */
  eligibiliteDsStatus: DSStatus | null;
}

/**
 * L'accord de l'AMO est requis uniquement si elle a validé l'accompagnement ET s'est
 * déclarée mandataire financier (engagement contractuel).
 *
 * `estMandataireFinancier` à null (question non posée / non répondue) est traité comme
 * non-mandataire : on ne bloque pas un demandeur sur une donnée absente.
 */
export function requiertAccordAmo(statut: StatutValidationAmo, estMandataireFinancier: boolean | null): boolean {
  return statut === StatutValidationAmo.LOGEMENT_ELIGIBLE && estMandataireFinancier === true;
}

/**
 * Le demandeur peut changer d'avis à tout moment, sauf pendant que la DDT tient son
 * formulaire d'éligibilité (du dépôt à la décision).
 */
export function peutAnnulerAccompagnement(etat: EtatAnnulationAccompagnement): boolean {
  if (!STATUTS_ANNULABLES.includes(etat.statut)) return false;
  if (etat.demandeArretAt) return false;
  if (estDossierChezLaDdt(etat.eligibiliteDsStatus)) return false;
  return true;
}

export interface EtatDemandeAccompagnement {
  statut: StatutValidationAmo;
  /** Statut DN du dossier d'éligibilité (null si pas encore de dossier). */
  eligibiliteDsStatus: DSStatus | null;
}

/**
 * Symétrique de `peutAnnulerAccompagnement` : un demandeur en autonomie peut changer
 * d'avis et demander un accompagnement, sauf pendant que la DDT tient son formulaire
 * d'éligibilité (même garde que l'annulation).
 */
export function peutDemanderAccompagnement(etat: EtatDemandeAccompagnement): boolean {
  if (etat.statut !== StatutValidationAmo.SANS_AMO) return false;
  if (estDossierChezLaDdt(etat.eligibiliteDsStatus)) return false;
  return true;
}

/**
 * Le formulaire d'éligibilité reste inaccessible entre la demande d'accompagnement après
 * autonomie et la réponse de l'AMO : `statutAmo` repasse à `EN_ATTENTE` alors que
 * `currentStep` reste `ÉLIGIBILITE`, et le dossier vient d'être réinitialisé (§2.10
 * FLOW-AND-SYNC.md). Prédicat partagé par `CalloutManager`, `getStepListItems` et
 * `StepDetailEligibilite`.
 *
 * `eligibiliteDsStatus` est requis : sur un dossier déjà transmis rien n'a été réinitialisé,
 * et bloquer priverait le demandeur de l'accès à son dossier sans rien corriger.
 */
export function estFormulaireEligibiliteBloqueParDemandeAccompagnement(
  statutAmo: StatutValidationAmo | null,
  currentStep: Step | null,
  eligibiliteDsStatus: DSStatus | null
): boolean {
  if (statutAmo !== StatutValidationAmo.EN_ATTENTE || currentStep !== Step.ELIGIBILITE) return false;
  return !estDossierDepose(eligibiliteDsStatus);
}
