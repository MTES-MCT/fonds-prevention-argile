import { Step } from "@/shared/domain/value-objects/step.enum";

export interface EtatFusionInvite {
  invite: {
    parcoursId: string;
    fcId: string | null;
    claimedAt: Date | null;
    currentStep: Step;
    nbDossiersDn: number;
    nbQualifications: number;
    adresse: string | null;
  };
  compte: {
    parcoursId: string;
    fcId: string | null;
    adresse: string | null;
  };
  /** Accepte deux adresses différentes : à n'utiliser qu'après vérification humaine. */
  adressesDifferentesAcceptees: boolean;
}

const normaliserAdresse = (adresse: string | null) => (adresse ?? "").trim().toLowerCase().replace(/\s+/g, " ");

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

  const memeAdresse = !!invite.adresse && normaliserAdresse(invite.adresse) === normaliserAdresse(compte.adresse);
  if (!memeAdresse && !etat.adressesDifferentesAcceptees) {
    motifs.push("Les deux dossiers ne portent pas la même adresse (--adresses-differentes pour passer outre).");
  }

  return motifs;
}
