import { avisRepo, parcoursRepo } from "@/shared/database/repositories";
import { demandeUnCommentaire, type NoteAvis } from "../domain/value-objects/avis";
import type { AvisPayload } from "../domain/value-objects/avis.schema";

export type ResultatAvis = { enregistre: true; avisId: string | null } | { enregistre: false };

// Une note qui ne demande pas d'explication efface le commentaire ; sinon on garde celui déjà saisi.
function commentaireAEcrire(note: NoteAvis, commentaire: string | undefined): string | null | undefined {
  return demandeUnCommentaire(note) ? commentaire : null;
}

export async function enregistrerAvis(payload: AvisPayload): Promise<ResultatAvis> {
  const commentaire = commentaireAEcrire(payload.note, payload.commentaire);

  if (!("parcoursId" in payload)) {
    if (payload.avisId) {
      const modifie = await avisRepo.updateAnonyme(payload.avisId, payload.sujet, {
        note: payload.note,
        commentaire,
      });
      return modifie ? { enregistre: true, avisId: modifie.id } : { enregistre: false };
    }
    const cree = await avisRepo.create({
      sujet: payload.sujet,
      note: payload.note,
      commentaire: commentaire ?? null,
      origine: payload.origine,
      simulationEligible: payload.simulationEligible ?? null,
      codeDepartement: payload.codeDepartement ?? null,
    });
    return { enregistre: true, avisId: cree.id };
  }

  const parcours = await parcoursRepo.findById(payload.parcoursId);
  if (!parcours) return { enregistre: false };

  await avisRepo.upsertPourParcours({
    parcoursId: parcours.id,
    sujet: payload.sujet,
    note: payload.note,
    origine: payload.origine,
    commentaire,
  });
  // L'identifiant ne sert qu'à compléter un avis anonyme : inutile de le renvoyer ici.
  return { enregistre: true, avisId: null };
}
