import { and, eq, sql } from "drizzle-orm";
import { db } from "../client";
import { catnatDecisions, type CatnatDecision, type NewCatnatDecision } from "../schema/catnat-decisions";

type CleDecision = Pick<CatnatDecision, "codeInsee" | "dateArrete" | "dateDebutEvt">;

const cle = (ligne: CleDecision) => `${ligne.codeInsee}|${ligne.dateArrete}|${ligne.dateDebutEvt}`;

/** Décisions en base que la source ne publie plus. */
export function decisionsARetirer<T extends CleDecision>(existantes: T[], recues: CleDecision[]): T[] {
  const publiees = new Set(recues.map(cle));
  return existantes.filter((ligne) => !publiees.has(cle(ligne)));
}

export interface BilanRemplacement {
  ajoutees: number;
  retirees: number;
}

export class CatnatDecisionsRepository {
  async findByCodeInsee(codeInsee: string): Promise<CatnatDecision[]> {
    return db.select().from(catnatDecisions).where(eq(catnatDecisions.codeInsee, codeInsee));
  }

  /**
   * Écrit les décisions d'une source et, si demandé, retire celles qu'elle ne publie plus
   */
  async remplacerSource(
    source: string,
    decisions: NewCatnatDecision[],
    options: { retirerAbsentes: boolean }
  ): Promise<BilanRemplacement> {
    return db.transaction(async (tx) => {
      const existantes = await tx
        .select({
          codeInsee: catnatDecisions.codeInsee,
          dateArrete: catnatDecisions.dateArrete,
          dateDebutEvt: catnatDecisions.dateDebutEvt,
        })
        .from(catnatDecisions)
        .where(eq(catnatDecisions.source, source));

      const absentes = options.retirerAbsentes ? decisionsARetirer(existantes, decisions) : [];

      for (const ligne of absentes) {
        await tx
          .delete(catnatDecisions)
          .where(
            and(
              eq(catnatDecisions.codeInsee, ligne.codeInsee),
              eq(catnatDecisions.dateArrete, ligne.dateArrete),
              eq(catnatDecisions.dateDebutEvt, ligne.dateDebutEvt)
            )
          );
      }

      const TAILLE_LOT = 500;
      for (let i = 0; i < decisions.length; i += TAILLE_LOT) {
        await tx
          .insert(catnatDecisions)
          .values(decisions.slice(i, i + TAILLE_LOT).map((decision) => ({ ...decision, updatedAt: new Date() })))
          .onConflictDoUpdate({
            target: [catnatDecisions.codeInsee, catnatDecisions.dateArrete, catnatDecisions.dateDebutEvt],
            set: {
              libelleCommune: sql`excluded.libelle_commune`,
              datePublicationJo: sql`excluded.date_publication_jo`,
              dateFinEvt: sql`excluded.date_fin_evt`,
              decision: sql`excluded.decision`,
              motif: sql`excluded.motif`,
              source: sql`excluded.source`,
              updatedAt: new Date(),
            },
          });
      }

      const connues = new Set(existantes.map(cle));
      return {
        ajoutees: decisions.filter((decision) => !connues.has(cle(decision))).length,
        retirees: absentes.length,
      };
    });
  }
}

export const catnatDecisionsRepository = new CatnatDecisionsRepository();
