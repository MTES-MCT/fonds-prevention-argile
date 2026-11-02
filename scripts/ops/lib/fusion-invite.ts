import { Step } from "@/shared/domain/value-objects/step.enum";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import { isSimulationComplete } from "@/features/simulateur/domain/rules/navigation";

export interface EtatFusionInvite {
  invite: {
    parcoursId: string;
    fcId: string | null;
    claimedAt: Date | null;
    currentStep: Step;
    nbDossiersDn: number;
    nbQualifications: number;
    simulationAgent: RGASimulationData | null;
  };
  compte: {
    parcoursId: string;
    fcId: string | null;
    nbDossiersDn: number;
    simulationDemandeur: RGASimulationData | null;
    simulationAgent: RGASimulationData | null;
  };
  /** Accepte deux adresses différentes : à n'utiliser qu'après vérification humaine. */
  adressesDifferentesAcceptees: boolean;
}

export interface PlanFusion {
  copierSimulation: boolean;
  /** Même règle que la correction d'un agent : une simulation complète devient celle du compte s'il n'en a pas. */
  promouvoirSimulation: boolean;
}

const normaliserAdresse = (adresse: string | null | undefined) =>
  (adresse ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export function planFusion(etat: EtatFusionInvite): PlanFusion {
  const simulation = etat.invite.simulationAgent;
  const complete = !!simulation && isSimulationComplete(simulation);
  // L'affichage lit l'agent d'abord : une adresse seule masquerait la simulation complète du demandeur.
  const copierSimulation =
    !!simulation && !etat.compte.simulationAgent && (complete || !etat.compte.simulationDemandeur);
  const promouvoirSimulation = copierSimulation && !etat.compte.simulationDemandeur && complete;
  return { copierSimulation, promouvoirSimulation };
}

/** Raisons de refuser la fusion ; vide quand elle peut avoir lieu. */
export function motifsDeRefusFusion(etat: EtatFusionInvite): string[] {
  const { invite, compte } = etat;
  const motifs: string[] = [];

  if (invite.parcoursId === compte.parcoursId) motifs.push("Les deux identifiants désignent le même parcours.");
  if (invite.fcId || invite.claimedAt) motifs.push("Le dossier invité a déjà été réclamé : ce n'est plus un stub.");
  if (invite.currentStep !== Step.INVITATION) motifs.push(`Le dossier invité n'est plus à l'étape invitation.`);
  if (!compte.fcId) motifs.push("Le compte cible n'est pas rattaché à FranceConnect.");
  // Un formulaire DN ou une qualification ne se déplacent pas sans arbitrage : traitement manuel.
  if (invite.nbDossiersDn > 0) motifs.push("Le dossier invité porte un formulaire DN.");
  if (invite.nbQualifications > 0) motifs.push("Le dossier invité porte une qualification Aller-vers.");
  // Le préremplissage DN ne sait que créer : la simulation copiée divergerait du formulaire existant.
  if (compte.nbDossiersDn > 0 && planFusion(etat).copierSimulation) {
    motifs.push("Le compte cible porte un formulaire DN : y copier la simulation de l'agent le ferait diverger.");
  }

  const adresseInvite = invite.simulationAgent?.logement?.adresse;
  const adresseCompte = compte.simulationDemandeur?.logement?.adresse ?? compte.simulationAgent?.logement?.adresse;
  const memeAdresse = !!adresseInvite && normaliserAdresse(adresseInvite) === normaliserAdresse(adresseCompte);
  if (!memeAdresse && !etat.adressesDifferentesAcceptees) {
    motifs.push("Les deux dossiers ne portent pas la même adresse (--adresses-differentes pour passer outre).");
  }

  return motifs;
}
