import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { StatutValidationAmo } from "./statutValidation";

/**
 * Statuts depuis lesquels le demandeur peut annuler son accompagnement.
 * Une demande refusée n'est pas « annulable » : le demandeur re-choisit un AMO.
 */
const STATUTS_ANNULABLES: StatutValidationAmo[] = [
  StatutValidationAmo.EN_ATTENTE,
  StatutValidationAmo.LOGEMENT_ELIGIBLE,
];

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
 * Le demandeur peut changer d'avis à tout moment, sauf une fois son formulaire
 * d'éligibilité pris en instruction par la DDT.
 */
export function peutAnnulerAccompagnement(etat: EtatAnnulationAccompagnement): boolean {
  if (!STATUTS_ANNULABLES.includes(etat.statut)) return false;
  if (etat.demandeArretAt) return false;
  if (etat.eligibiliteDsStatus === DSStatus.EN_INSTRUCTION) return false;
  return true;
}
