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

/** La DDT a tranché : ce formulaire est soldé et ne déclare plus rien de corrigeable. */
export function estDecisionDdtRendue(eligibiliteDsStatus: DSStatus | null): boolean {
  return (
    eligibiliteDsStatus === DSStatus.ACCEPTE ||
    eligibiliteDsStatus === DSStatus.REFUSE ||
    eligibiliteDsStatus === DSStatus.CLASSE_SANS_SUITE
  );
}

/** Transmis, décision rendue ou non : plus rien n'est réinitialisable (`verifierRegeneration`). */
export function estDossierDepose(eligibiliteDsStatus: DSStatus | null): boolean {
  return estDossierChezLaDdt(eligibiliteDsStatus) || estDecisionDdtRendue(eligibiliteDsStatus);
}

/**
 * Côté AMO (« Ne plus accompagner ») : au diagnostic, elle porte la demande de paiement — elle
 * l'initie quand elle est mandataire financier. Se détacher laisserait ce dossier DN sans suivi.
 */
export function estArretGeleAuDiagnostic(currentStep: Step | null): boolean {
  return currentStep === Step.DIAGNOSTIC;
}

/** Étapes où le demandeur ne peut plus renoncer à son AMO : l'éligibilité est derrière lui. */
const STEPS_APRES_ELIGIBILITE: readonly Step[] = [Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES];

/**
 * Le demandeur ne change d'avis que pendant l'éligibilité, tant que rien n'est déposé.
 * Sans cette borne, une éligibilité acceptée lui rouvrait l'arrêt pour tout le reste du parcours.
 */
export function estArretDemandeurTropTard(currentStep: Step | null): boolean {
  return currentStep !== null && STEPS_APRES_ELIGIBILITE.includes(currentStep);
}

export interface EtatAnnulationAccompagnement {
  statut: StatutValidationAmo;
  /** Étape courante du parcours — requis : l'arrêt n'est plus possible après l'éligibilité. */
  currentStep: Step | null;
  /** Non-null = une demande d'arrêt est déjà en attente de réponse AMO. */
  demandeArretAt: Date | null;
  /** Statut DN du dossier d'éligibilité (null si pas encore de dossier). */
  eligibiliteDsStatus: DSStatus | null;
  /** Dossier archivé : cf. `dossierArchive` sur `EtatDemandeAccompagnement`. */
  dossierArchive: boolean;
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
 * formulaire d'éligibilité (du dépôt à la décision), et plus du tout une fois l'éligibilité passée.
 */
export function peutAnnulerAccompagnement(etat: EtatAnnulationAccompagnement): boolean {
  if (etat.dossierArchive) return false;
  if (!STATUTS_ANNULABLES.includes(etat.statut)) return false;
  if (etat.demandeArretAt) return false;
  if (estDossierChezLaDdt(etat.eligibiliteDsStatus)) return false;
  if (estArretDemandeurTropTard(etat.currentStep)) return false;
  return true;
}

export interface EtatDemandeAccompagnement {
  statut: StatutValidationAmo;
  /** Statut DN du dossier d'éligibilité (null si pas encore de dossier). */
  eligibiliteDsStatus: DSStatus | null;
  /**
   * `parcours.archived_at` non nul. Requis : un dossier archivé n'a plus d'accompagnement
   * à changer — inéligibilité (qualification Aller-vers ou simulation du demandeur, qui
   * archivent toutes deux) comme archivage manuel (abandon, non-réponse…). Le cas d'une
   * décision AMO « non éligible » est déjà couvert par `statut`, pas celui d'un `SANS_AMO`
   * ou d'un `EN_ATTENTE` archivé après coup.
   */
  dossierArchive: boolean;
}

/**
 * Symétrique de `peutAnnulerAccompagnement` : un demandeur en autonomie peut changer
 * d'avis et demander un accompagnement, sauf pendant que la DDT tient son formulaire
 * d'éligibilité (même garde que l'annulation) et sauf dossier archivé.
 */
export function peutDemanderAccompagnement(etat: EtatDemandeAccompagnement): boolean {
  if (etat.dossierArchive) return false;
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
