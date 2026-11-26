import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "../client";
import { avis, type Avis, type NewAvis } from "../schema/avis";

interface AvisParcours {
  parcoursId: string;
  sujet: string;
  note: number;
  origine: string;
  // undefined : on garde le commentaire déjà enregistré.
  commentaire?: string | null;
}

export class AvisRepository {
  async create(data: NewAvis): Promise<Avis> {
    const [row] = await db.insert(avis).values(data).returning();
    return row;
  }

  async upsertPourParcours({ commentaire, ...data }: AvisParcours): Promise<Avis> {
    const [row] = await db
      .insert(avis)
      .values({ ...data, commentaire: commentaire ?? null })
      .onConflictDoUpdate({
        target: [avis.parcoursId, avis.sujet],
        set: { note: data.note, updatedAt: new Date(), ...(commentaire !== undefined ? { commentaire } : {}) },
      })
      .returning();
    return row;
  }

  // Limité aux avis anonymes : un identifiant ne doit jamais permettre de réécrire l'avis d'un parcours.
  async updateAnonyme(
    id: string,
    sujet: string,
    { note, commentaire }: { note: number; commentaire?: string | null }
  ): Promise<Avis | null> {
    const [row] = await db
      .update(avis)
      .set({ note, updatedAt: new Date(), ...(commentaire !== undefined ? { commentaire } : {}) })
      .where(and(eq(avis.id, id), eq(avis.sujet, sujet), isNull(avis.parcoursId)))
      .returning();
    return row ?? null;
  }

  async findNotes(): Promise<Pick<Avis, "sujet" | "note">[]> {
    return db.select({ sujet: avis.sujet, note: avis.note }).from(avis);
  }

  async findCommentaires(limite: number): Promise<Pick<Avis, "id" | "sujet" | "note" | "commentaire" | "createdAt">[]> {
    return db
      .select({
        id: avis.id,
        sujet: avis.sujet,
        note: avis.note,
        commentaire: avis.commentaire,
        createdAt: avis.createdAt,
      })
      .from(avis)
      .where(isNotNull(avis.commentaire))
      .orderBy(desc(avis.createdAt))
      .limit(limite);
  }
}

export const avisRepository = new AvisRepository();
