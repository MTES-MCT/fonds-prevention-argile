export const ETAPES_AVIS = ["compte", "choix_amo", "eligibilite", "diagnostic", "devis", "factures"] as const;
export const SUJET_SIMULATEUR = "simulateur";
export const SUJETS_AVIS = [SUJET_SIMULATEUR, ...ETAPES_AVIS] as const;

export type EtapeAvis = (typeof ETAPES_AVIS)[number];
export type SujetAvis = (typeof SUJETS_AVIS)[number];

export const NOTES_AVIS = [1, 2, 3, 4, 5] as const;
export type NoteAvis = (typeof NOTES_AVIS)[number];

export const ORIGINES_AVIS = ["mail", "en_direct"] as const;
export type OrigineAvis = (typeof ORIGINES_AVIS)[number];

export const LIBELLES_NOTE: Record<NoteAvis, string> = {
  1: "Très difficile",
  2: "Difficile",
  3: "Correcte",
  4: "Facile",
  5: "Très facile",
};

// Libellés repris du mail : ils s'insèrent après « l'étape ».
export const LIBELLES_ETAPE: Record<EtapeAvis, string> = {
  compte: "de création de votre compte",
  choix_amo: "de choix de votre AMO",
  eligibilite: "du formulaire d'éligibilité",
  diagnostic: "du diagnostic",
  devis: "des devis",
  factures: "des travaux et du paiement",
};

export const LONGUEUR_MAX_COMMENTAIRE = 1000;
const NOTE_MAX_AVEC_COMMENTAIRE = 2;

export function estEtapeAvis(sujet: SujetAvis): sujet is EtapeAvis {
  return sujet !== SUJET_SIMULATEUR;
}

export function demandeUnCommentaire(note: NoteAvis): boolean {
  return note <= NOTE_MAX_AVEC_COMMENTAIRE;
}

export function estNoteAvis(valeur: number): valeur is NoteAvis {
  return NOTES_AVIS.some((note) => note === valeur);
}

export function questionAvis(sujet: SujetAvis): string {
  return estEtapeAvis(sujet) ? `L'étape ${LIBELLES_ETAPE[sujet]} était :` : "Le simulateur était :";
}

export function titreAvis(sujet: SujetAvis): string {
  return estEtapeAvis(sujet)
    ? `Comment s'est passée l'étape ${LIBELLES_ETAPE[sujet]} ?`
    : "Comment s'est passée votre simulation ?";
}
