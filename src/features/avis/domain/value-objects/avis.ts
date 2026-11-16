export const ETAPES_AVIS = ["compte", "choix_amo", "eligibilite", "diagnostic", "devis", "factures"] as const;
// Sujets sans parcours : l'avis est donné en direct, sous le résultat d'un simulateur public.
export const SUJETS_ANONYMES = ["simulateur", "vulnerabilite"] as const;
export const SUJETS_AVIS = [...SUJETS_ANONYMES, ...ETAPES_AVIS] as const;

export type EtapeAvis = (typeof ETAPES_AVIS)[number];
export type SujetAnonyme = (typeof SUJETS_ANONYMES)[number];
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

const LIBELLES_SUJET_ANONYME: Record<SujetAnonyme, { nom: string; titre: string }> = {
  simulateur: { nom: "Le simulateur", titre: "Votre avis sur le simulateur" },
  vulnerabilite: { nom: "Le simulateur de vulnérabilité", titre: "Votre avis sur le simulateur de vulnérabilité" },
};

export const LONGUEUR_MAX_COMMENTAIRE = 1000;
const NOTE_MAX_AVEC_COMMENTAIRE = 2;

export function estEtapeAvis(sujet: SujetAvis): sujet is EtapeAvis {
  return ETAPES_AVIS.some((etape) => etape === sujet);
}

export function demandeUnCommentaire(note: NoteAvis): boolean {
  return note <= NOTE_MAX_AVEC_COMMENTAIRE;
}

export function estNoteAvis(valeur: number): valeur is NoteAvis {
  return NOTES_AVIS.some((note) => note === valeur);
}

// « L'étape était correcte », « le simulateur était correct » : seul ce libellé s'accorde.
export function libelleNote(note: NoteAvis, sujet: SujetAvis): string {
  return note === 3 && !estEtapeAvis(sujet) ? "Correct" : LIBELLES_NOTE[note];
}

export function questionAvis(sujet: SujetAvis): string {
  return estEtapeAvis(sujet)
    ? `L'étape ${LIBELLES_ETAPE[sujet]} était :`
    : `${LIBELLES_SUJET_ANONYME[sujet].nom} était :`;
}

export function titreAvis(sujet: SujetAvis): string {
  return estEtapeAvis(sujet)
    ? `Comment s'est passée l'étape ${LIBELLES_ETAPE[sujet]} ?`
    : LIBELLES_SUJET_ANONYME[sujet].titre;
}
