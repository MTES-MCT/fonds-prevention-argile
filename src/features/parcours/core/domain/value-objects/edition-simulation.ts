import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { estDossierChezLaDdt } from "@/features/parcours/amo/domain/value-objects/arretAccompagnement";

/** Pourquoi le demandeur ne peut que consulter sa simulation. */
export type RaisonLectureSeule = "correction_agent" | "dossier_chez_la_ddt";

export interface EtatEditionSimulation {
  /** Un agent a corrigé la simulation : sa version prime à l'affichage. */
  simulationCorrigeeParAgent: boolean;
  /** Statut DN du formulaire d'éligibilité, seul dossier déclarant la simulation. */
  eligibiliteDsStatus: DSStatus | null;
}

/**
 * Le demandeur peut-il modifier sa propre simulation ?
 *
 * Deux verrous, tous deux réversibles :
 *  - une correction d'agent fait foi (`rgaSimulationDataAgent` prime dans
 *    `getEffectiveRGAData`) : le laisser éditer produirait un écran qui ne change
 *    rien à ce qu'il voit ensuite ;
 *  - un formulaire chez la DDT déclare déjà ces données et le préremplissage DN
 *    ne sait que créer, jamais corriger (cf. FLOW-AND-SYNC §2.7.1). Le verrou
 *    tombe dès la décision rendue.
 */
export function peutModifierSaSimulation(etat: EtatEditionSimulation): boolean {
  return raisonLectureSeule(etat) === null;
}

export function raisonLectureSeule(etat: EtatEditionSimulation): RaisonLectureSeule | null {
  if (etat.simulationCorrigeeParAgent) return "correction_agent";
  if (estDossierChezLaDdt(etat.eligibiliteDsStatus)) return "dossier_chez_la_ddt";
  return null;
}

export const MESSAGES_LECTURE_SEULE: Record<RaisonLectureSeule, string> = {
  correction_agent:
    "Votre conseiller a mis à jour ces informations avec vous. Contactez-le si l’une d’elles doit encore être corrigée.",
  dossier_chez_la_ddt:
    "Votre formulaire d’éligibilité est en cours d’examen. Vos informations redeviendront modifiables une fois la décision rendue.",
};
