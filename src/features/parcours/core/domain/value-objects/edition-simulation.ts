import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import {
  estDecisionDdtRendue,
  estDossierChezLaDdt,
} from "@/features/parcours/amo/domain/value-objects/arretAccompagnement";

/** Pourquoi le demandeur ne peut que consulter sa simulation. */
export type RaisonLectureSeule = "correction_agent" | "decision_amo" | "dossier_chez_la_ddt" | "formulaire_dn_commence";

export interface EtatEditionSimulation {
  /** Un agent a corrigé la simulation : sa version prime à l'affichage. */
  simulationCorrigeeParAgent: boolean;
  /** L'AMO a statué sur l'éligibilité à partir de ces données (`aRenduSaDecision`). */
  decisionAmoRendue: boolean;
  /**
   * Un formulaire d'éligibilité DN existe — prérempli créé, transmis ou non. À distinguer
   * d'un `eligibiliteDsStatus` nul, qui vaut aussi bien « aucun formulaire » que
   * « formulaire créé, pas encore transmis ».
   */
  eligibiliteDossierExiste: boolean;
  /** Statut DN du formulaire d'éligibilité, seul dossier déclarant la simulation. */
  eligibiliteDsStatus: DSStatus | null;
}

/**
 * Le demandeur peut-il modifier sa propre simulation ?
 *
 * Trois verrous :
 *  - une correction d'agent fait foi (`rgaSimulationDataAgent` prime dans
 *    `getEffectiveRGAData`) : le laisser éditer produirait un écran qui ne change
 *    rien à ce qu'il voit ensuite ;
 *  - l'AMO a statué sur l'éligibilité à partir de ces données : les corriger seul
 *    déferait une décision professionnelle (et, non éligible, archiverait par-dessus
 *    elle). La correction passe désormais par le conseiller ;
 *  - un formulaire chez la DDT déclare déjà ces données et le préremplissage DN
 *    ne sait que créer, jamais corriger (cf. FLOW-AND-SYNC §2.7.1). Le verrou
 *    tombe dès la décision rendue.
 *
 * L'ordre des raisons va du plus durable au plus transitoire : annoncer « vos
 * informations redeviendront modifiables » serait faux si un verrou définitif tient
 * déjà derrière.
 */
export function peutModifierSaSimulation(etat: EtatEditionSimulation): boolean {
  return raisonLectureSeule(etat) === null;
}

export function raisonLectureSeule(etat: EtatEditionSimulation): RaisonLectureSeule | null {
  if (etat.simulationCorrigeeParAgent) return "correction_agent";
  if (etat.decisionAmoRendue) return "decision_amo";
  if (estDossierChezLaDdt(etat.eligibiliteDsStatus)) return "dossier_chez_la_ddt";
  // Créé mais pas encore transmis : le préremplissage y a déjà reporté ces réponses et ne
  // sait pas les mettre à jour. Se lève à la décision, comme le verrou ci-dessus.
  if (etat.eligibiliteDossierExiste && !estDecisionDdtRendue(etat.eligibiliteDsStatus)) return "formulaire_dn_commence";
  return null;
}

export const MESSAGES_LECTURE_SEULE: Record<RaisonLectureSeule, string> = {
  correction_agent:
    "Votre conseiller a mis à jour ces informations avec vous. Contactez-le si l’une d’elles doit encore être corrigée.",
  decision_amo:
    "Votre conseiller s’est prononcé sur votre éligibilité à partir de ces informations. Contactez-le si l’une d’elles doit être corrigée.",
  dossier_chez_la_ddt:
    "Votre formulaire d’éligibilité est en cours d’examen. Vos informations redeviendront modifiables une fois la décision rendue.",
  formulaire_dn_commence:
    "Votre formulaire d’éligibilité est déjà commencé : ces informations y ont été reportées et n’y sont plus corrigées automatiquement. Modifiez-les directement dans le formulaire.",
};
