import {
  LIBELLES_SUJET,
  NOTES_AVIS,
  SUJETS_AVIS,
  estNoteAvis,
  estSujetAvis,
  type NoteAvis,
  type SujetAvis,
} from "@/features/avis/domain/value-objects/avis";

// En dessous, une moyenne ou un pourcentage dit plus sur le hasard que sur l'étape.
export const SEUIL_REPONSES = 10;
const NOTE_MIN_FACILE = 4;

export interface StatSujet {
  sujet: SujetAvis;
  libelle: string;
  reponses: number;
  repartition: Record<NoteAvis, number>;
  // null sous le seuil de réponses.
  noteMoyenne: number | null;
  partFacile: number | null;
}

export interface CommentaireAvis {
  id: string;
  libelle: string;
  note: number;
  commentaire: string;
  date: string;
}

function repartitionVide(): Record<NoteAvis, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

export function calculerStatsSatisfaction(
  lignes: { sujet: string; note: number }[],
  sujets: readonly SujetAvis[] = SUJETS_AVIS
): StatSujet[] {
  const parSujet = new Map(sujets.map((sujet) => [sujet, repartitionVide()]));
  for (const { sujet, note } of lignes) {
    if (!estSujetAvis(sujet) || !estNoteAvis(note)) continue;
    const repartition = parSujet.get(sujet);
    if (repartition) repartition[note] += 1;
  }

  return sujets.map((sujet) => {
    const repartition = parSujet.get(sujet) ?? repartitionVide();
    const reponses = NOTES_AVIS.reduce((total, note) => total + repartition[note], 0);
    const assez = reponses >= SEUIL_REPONSES;
    const somme = NOTES_AVIS.reduce((total, note) => total + note * repartition[note], 0);
    const faciles = NOTES_AVIS.filter((note) => note >= NOTE_MIN_FACILE).reduce((t, note) => t + repartition[note], 0);
    return {
      sujet,
      libelle: LIBELLES_SUJET[sujet],
      reponses,
      repartition,
      noteMoyenne: assez ? Math.round((somme / reponses) * 10) / 10 : null,
      partFacile: assez ? Math.round((faciles / reponses) * 100) : null,
    };
  });
}
