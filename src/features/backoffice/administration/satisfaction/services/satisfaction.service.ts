import { avisRepo } from "@/shared/database/repositories";
import { LIBELLES_SUJET, SUJETS_AVIS, estSujetAvis } from "@/features/avis/domain/value-objects/avis";
import { isVulnerabiliteRgaActive } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite";
import { calculerStatsSatisfaction, type CommentaireAvis, type StatSujet } from "../domain/satisfaction";

const LIMITE_COMMENTAIRES = 200;

export interface Satisfaction {
  stats: StatSujet[];
  // null : le lecteur n'a pas le droit de lire les commentaires, ils ne sont pas chargés.
  commentaires: CommentaireAvis[] | null;
}

export async function getSatisfaction({ avecCommentaires }: { avecCommentaires: boolean }): Promise<Satisfaction> {
  const sujets = SUJETS_AVIS.filter((sujet) => sujet !== "vulnerabilite" || isVulnerabiliteRgaActive());
  const stats = calculerStatsSatisfaction(await avisRepo.findNotes(), sujets);
  if (!avecCommentaires) return { stats, commentaires: null };

  const lignes = await avisRepo.findCommentaires(LIMITE_COMMENTAIRES);
  const commentaires = lignes.flatMap((ligne) =>
    ligne.commentaire && estSujetAvis(ligne.sujet)
      ? [
          {
            id: ligne.id,
            libelle: LIBELLES_SUJET[ligne.sujet],
            note: ligne.note,
            commentaire: ligne.commentaire,
            date: ligne.createdAt.toISOString(),
          },
        ]
      : []
  );
  return { stats, commentaires };
}
