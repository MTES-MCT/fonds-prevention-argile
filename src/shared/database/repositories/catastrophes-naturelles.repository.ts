import { eq, and, gte, desc, sql, inArray, SQL } from "drizzle-orm";
import { db } from "../client";
import { catastrophesNaturelles } from "../schema/catastrophes-naturelles";
import type { CatastropheNaturelle, NewCatastropheNaturelle } from "../schema/catastrophes-naturelles";
import { dateToSqlString } from "@/shared/utils";

/**
 * Repository pour les catastrophes naturelles
 *
 * Note: Ce repository n'étend pas BaseRepository car la table utilise une clé composite
 * (codeNationalCatnat, codeInsee) au lieu d'un ID simple.
 */
export class CatastrophesNaturellesRepository {
  /**
   * Trouve une catastrophe naturelle par sa clé composite
   */
  async findByCompositeKey(codeNationalCatnat: string, codeInsee: string): Promise<CatastropheNaturelle | null> {
    const [result] = await db
      .select()
      .from(catastrophesNaturelles)
      .where(
        and(
          eq(catastrophesNaturelles.codeNationalCatnat, codeNationalCatnat),
          eq(catastrophesNaturelles.codeInsee, codeInsee)
        )
      )
      .limit(1);

    return result || null;
  }

  /**
   * Récupère toutes les catastrophes naturelles
   */
  async findAll(): Promise<CatastropheNaturelle[]> {
    return db.select().from(catastrophesNaturelles).orderBy(desc(catastrophesNaturelles.dateDebutEvt));
  }

  /**
   * Crée une nouvelle catastrophe naturelle
   */
  async create(data: NewCatastropheNaturelle): Promise<CatastropheNaturelle> {
    const [created] = await db.insert(catastrophesNaturelles).values(data).returning();
    return created;
  }

  /**
   * Met à jour une catastrophe naturelle
   */
  async update(
    codeNationalCatnat: string,
    codeInsee: string,
    data: Partial<NewCatastropheNaturelle>
  ): Promise<CatastropheNaturelle | null> {
    const updateData: Partial<NewCatastropheNaturelle> = {
      ...data,
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(catastrophesNaturelles)
      .set(updateData)
      .where(
        and(
          eq(catastrophesNaturelles.codeNationalCatnat, codeNationalCatnat),
          eq(catastrophesNaturelles.codeInsee, codeInsee)
        )
      )
      .returning();

    return updated || null;
  }

  /**
   * Supprime une catastrophe naturelle
   */
  async delete(codeNationalCatnat: string, codeInsee: string): Promise<boolean> {
    const result = await db
      .delete(catastrophesNaturelles)
      .where(
        and(
          eq(catastrophesNaturelles.codeNationalCatnat, codeNationalCatnat),
          eq(catastrophesNaturelles.codeInsee, codeInsee)
        )
      )
      .returning();

    return result.length > 0;
  }

  /**
   * Vérifie si une catastrophe naturelle existe
   */
  async exists(codeNationalCatnat: string, codeInsee: string): Promise<boolean> {
    const result = await db
      .select({ code: catastrophesNaturelles.codeNationalCatnat })
      .from(catastrophesNaturelles)
      .where(
        and(
          eq(catastrophesNaturelles.codeNationalCatnat, codeNationalCatnat),
          eq(catastrophesNaturelles.codeInsee, codeInsee)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Compte le nombre de catastrophes naturelles
   */
  async count(where?: SQL): Promise<number> {
    const query = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(catastrophesNaturelles);

    if (where) {
      query.where(where);
    }

    const [result] = await query;
    return result?.count || 0;
  }

  /**
   * Exécute une transaction
   */
  protected async transaction<R>(callback: (tx: typeof db) => Promise<R>): Promise<R> {
    return await callback(db);
  }

  // ========================================================================
  // Méthodes spécifiques au métier
  // ========================================================================

  /**
   * Insère une catastrophe naturelle (ou met à jour si existe déjà)
   */
  async upsert(data: NewCatastropheNaturelle): Promise<CatastropheNaturelle> {
    const [result] = await db
      .insert(catastrophesNaturelles)
      .values({
        ...data,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [catastrophesNaturelles.codeNationalCatnat, catastrophesNaturelles.codeInsee],
        set: {
          dateDebutEvt: sql`excluded.date_debut_evt`,
          dateFinEvt: sql`excluded.date_fin_evt`,
          datePublicationArrete: sql`excluded.date_publication_arrete`,
          datePublicationJo: sql`excluded.date_publication_jo`,
          libelleRisqueJo: sql`excluded.libelle_risque_jo`,
          libelleCommune: sql`excluded.libelle_commune`,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  }

  /**
   * Insère plusieurs catastrophes naturelles en une seule transaction
   */
  async batchUpsert(dataList: NewCatastropheNaturelle[]): Promise<void> {
    if (dataList.length === 0) return;

    await this.transaction(async (tx) => {
      const BATCH_SIZE = 100;

      for (let i = 0; i < dataList.length; i += BATCH_SIZE) {
        const batch = dataList.slice(i, i + BATCH_SIZE);

        await tx
          .insert(catastrophesNaturelles)
          .values(
            batch.map((data) => ({
              ...data,
              updatedAt: new Date(),
            }))
          )
          .onConflictDoUpdate({
            target: [catastrophesNaturelles.codeNationalCatnat, catastrophesNaturelles.codeInsee],
            set: {
              dateDebutEvt: sql`excluded.date_debut_evt`,
              dateFinEvt: sql`excluded.date_fin_evt`,
              datePublicationArrete: sql`excluded.date_publication_arrete`,
              datePublicationJo: sql`excluded.date_publication_jo`,
              libelleRisqueJo: sql`excluded.libelle_risque_jo`,
              libelleCommune: sql`excluded.libelle_commune`,
              updatedAt: new Date(),
            },
          });
      }
    });
  }

  /**
   * Récupère toutes les catastrophes naturelles d'une commune
   */
  async findByCodeInsee(codeInsee: string): Promise<CatastropheNaturelle[]> {
    return db
      .select()
      .from(catastrophesNaturelles)
      .where(eq(catastrophesNaturelles.codeInsee, codeInsee))
      .orderBy(desc(catastrophesNaturelles.dateDebutEvt));
  }

  /**
   * Récupère les catastrophes naturelles d'une commune depuis une date donnée
   */
  async findByCodeInseeFromDate(codeInsee: string, fromDate: Date): Promise<CatastropheNaturelle[]> {
    const dateString = dateToSqlString(fromDate);

    return db
      .select()
      .from(catastrophesNaturelles)
      .where(and(eq(catastrophesNaturelles.codeInsee, codeInsee), gte(catastrophesNaturelles.dateDebutEvt, dateString)))
      .orderBy(desc(catastrophesNaturelles.dateDebutEvt));
  }

  /**
   * Récupère les catastrophes naturelles pour plusieurs communes
   */
  async findByCodesInsee(codesInsee: string[]): Promise<CatastropheNaturelle[]> {
    if (codesInsee.length === 0) return [];

    return db
      .select()
      .from(catastrophesNaturelles)
      .where(inArray(catastrophesNaturelles.codeInsee, codesInsee))
      .orderBy(desc(catastrophesNaturelles.dateDebutEvt));
  }

  /**
   * Compte le nombre de catastrophes naturelles par commune pour un département
   */
  async countByDepartement(codesDepartement: string[]): Promise<
    Array<{
      codeInsee: string;
      libelleCommune: string;
      count: number;
    }>
  > {
    // On récupère toutes les catastrophes puis on groupe côté application
    const allCatnats = await db
      .select({
        codeInsee: catastrophesNaturelles.codeInsee,
        libelleCommune: catastrophesNaturelles.libelleCommune,
        codeNationalCatnat: catastrophesNaturelles.codeNationalCatnat,
      })
      .from(catastrophesNaturelles);

    // Filtrer par département (les 2 ou 3 premiers caractères du code INSEE selon le département)
    const filteredByDept = allCatnats.filter((catnat) =>
      codesDepartement.some((codeDept) => catnat.codeInsee.startsWith(codeDept))
    );

    // Grouper par commune
    const grouped = new Map<string, { libelleCommune: string; count: number }>();

    for (const catnat of filteredByDept) {
      const existing = grouped.get(catnat.codeInsee);
      if (existing) {
        existing.count++;
      } else {
        grouped.set(catnat.codeInsee, {
          libelleCommune: catnat.libelleCommune,
          count: 1,
        });
      }
    }

    return Array.from(grouped.entries()).map(([codeInsee, data]) => ({
      codeInsee,
      libelleCommune: data.libelleCommune,
      count: data.count,
    }));
  }

  /**
   * Compte le total de catastrophes naturelles pour un département
   */
  async getTotalByDepartement(codeDepartement: string): Promise<number> {
    const result = await db
      .select({
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(catastrophesNaturelles)
      .where(sql`${catastrophesNaturelles.codeInsee} LIKE ${codeDepartement + "%"}`);

    return result[0]?.count ?? 0;
  }

  /**
   * Récupère les statistiques par type de risque pour une commune
   */
  async getStatsByTypeForCommune(codeInsee: string): Promise<
    Array<{
      libelleRisqueJo: string;
      count: number;
    }>
  > {
    const result = await db
      .select({
        libelleRisqueJo: catastrophesNaturelles.libelleRisqueJo,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(catastrophesNaturelles)
      .where(eq(catastrophesNaturelles.codeInsee, codeInsee))
      .groupBy(catastrophesNaturelles.libelleRisqueJo)
      .orderBy(desc(sql`count(*)`));

    return result;
  }

  /**
   * Supprime toutes les catastrophes naturelles (utile pour le reset)
   */
  async deleteAll(): Promise<void> {
    await db.delete(catastrophesNaturelles);
  }
}

// Instance singleton
export const catastrophesNaturellesRepository = new CatastrophesNaturellesRepository();
