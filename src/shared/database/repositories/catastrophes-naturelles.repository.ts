import { eq, and, gte, desc, sql, inArray, SQL } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { db } from "../client";
import { catastrophesNaturelles } from "../schema/catastrophes-naturelles";
import type { CatastropheNaturelle, NewCatastropheNaturelle } from "../schema/catastrophes-naturelles";
import { dateToSqlString } from "@/shared/utils";

const CLE_PERIODE = [
  catastrophesNaturelles.codeNationalCatnat,
  catastrophesNaturelles.codeInsee,
  catastrophesNaturelles.dateDebutEvt,
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Executor = typeof db | PgTransaction<any, any, any>;

type Periode = Pick<CatastropheNaturelle, "codeNationalCatnat" | "codeInsee" | "dateDebutEvt">;

const cleCouple = (ligne: Periode) => `${ligne.codeNationalCatnat}|${ligne.codeInsee}`;
const clePeriode = (ligne: Periode) => `${cleCouple(ligne)}|${ligne.dateDebutEvt}`;

/** Périodes en base que la source ne donne plus, pour les seuls couples arrêté-commune qu'elle vient de renvoyer. */
export function periodesARetirer<T extends Periode>(existantes: T[], recues: Periode[]): T[] {
  const couples = new Set(recues.map(cleCouple));
  const periodes = new Set(recues.map(clePeriode));

  return existantes.filter((ligne) => couples.has(cleCouple(ligne)) && !periodes.has(clePeriode(ligne)));
}

/**
 * Repository pour les catastrophes naturelles
 *
 * Note: Ce repository n'étend pas BaseRepository car la table utilise une clé composite
 * (codeNationalCatnat, codeInsee, dateDebutEvt) au lieu d'un ID simple.
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
        target: CLE_PERIODE,
        set: {
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
   * Insère plusieurs catastrophes naturelles (ou les met à jour si elles existent déjà)
   */
  async batchUpsert(dataList: NewCatastropheNaturelle[]): Promise<void> {
    if (dataList.length === 0) return;

    await this.ecrirePeriodes(db, dataList);
  }

  private async ecrirePeriodes(executor: Executor, dataList: NewCatastropheNaturelle[]): Promise<void> {
    const BATCH_SIZE = 100;

    for (let i = 0; i < dataList.length; i += BATCH_SIZE) {
      const batch = dataList.slice(i, i + BATCH_SIZE);

      await executor
        .insert(catastrophesNaturelles)
        .values(
          batch.map((data) => ({
            ...data,
            updatedAt: new Date(),
          }))
        )
        .onConflictDoUpdate({
          target: CLE_PERIODE,
          set: {
            dateFinEvt: sql`excluded.date_fin_evt`,
            datePublicationArrete: sql`excluded.date_publication_arrete`,
            datePublicationJo: sql`excluded.date_publication_jo`,
            libelleRisqueJo: sql`excluded.libelle_risque_jo`,
            libelleCommune: sql`excluded.libelle_commune`,
            updatedAt: new Date(),
          },
        });
    }
  }

  /**
   * Écrit les périodes reçues et retire celles que la source ne donne plus pour les mêmes arrêtés et communes
   */
  async remplacerPeriodes(dataList: NewCatastropheNaturelle[]): Promise<void> {
    if (dataList.length === 0) return;

    // Retrait et écriture d'un seul tenant : un échec entre les deux ferait disparaître une période des pages.
    await db.transaction(async (tx) => {
      const existantes = await tx
        .select({
          codeNationalCatnat: catastrophesNaturelles.codeNationalCatnat,
          codeInsee: catastrophesNaturelles.codeInsee,
          dateDebutEvt: catastrophesNaturelles.dateDebutEvt,
        })
        .from(catastrophesNaturelles)
        .where(inArray(catastrophesNaturelles.codeInsee, [...new Set(dataList.map((ligne) => ligne.codeInsee))]));

      // Une date corrigée à la source change la clé : sans ce retrait, l'ancienne période resterait en double.
      for (const ligne of periodesARetirer(existantes, dataList)) {
        await tx
          .delete(catastrophesNaturelles)
          .where(
            and(
              eq(catastrophesNaturelles.codeNationalCatnat, ligne.codeNationalCatnat),
              eq(catastrophesNaturelles.codeInsee, ligne.codeInsee),
              eq(catastrophesNaturelles.dateDebutEvt, ligne.dateDebutEvt)
            )
          );
      }

      await this.ecrirePeriodes(tx, dataList);
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
   * Compte le total de catastrophes naturelles uniques pour un département
   * (dédupliquées par codeNationalCatnat)
   */
  async getTotalByDepartement(codeDepartement: string): Promise<number> {
    const result = await db
      .select({
        count: sql<number>`cast(count(DISTINCT ${catastrophesNaturelles.codeNationalCatnat}) as integer)`,
      })
      .from(catastrophesNaturelles)
      .where(sql`${catastrophesNaturelles.codeInsee} LIKE ${codeDepartement + "%"}`);

    return result[0]?.count ?? 0;
  }

  /**
   * Récupère la liste des catastrophes naturelles uniques touchant un département
   */
  async getUniqueCatastrophesByDepartement(codeDepartement: string): Promise<CatastropheNaturelle[]> {
    // Sous-requête pour récupérer un seul enregistrement par codeNationalCatnat
    const subquery = db
      .select({
        codeNationalCatnat: catastrophesNaturelles.codeNationalCatnat,
        minCodeInsee: sql<string>`MIN(${catastrophesNaturelles.codeInsee})`.as("min_code_insee"),
      })
      .from(catastrophesNaturelles)
      .where(sql`${catastrophesNaturelles.codeInsee} LIKE ${codeDepartement + "%"}`)
      .groupBy(catastrophesNaturelles.codeNationalCatnat)
      .as("subquery");

    const result = await db
      .select()
      .from(catastrophesNaturelles)
      .innerJoin(
        subquery,
        and(
          eq(catastrophesNaturelles.codeNationalCatnat, subquery.codeNationalCatnat),
          eq(catastrophesNaturelles.codeInsee, subquery.minCodeInsee)
        )
      )
      .orderBy(desc(catastrophesNaturelles.dateDebutEvt));

    return result.map((r) => r.catastrophes_naturelles);
  }

  /**
   * Compte le total de catastrophes naturelles uniques pour un EPCI
   * (dédupliquées par codeNationalCatnat)
   */
  async getTotalByEpci(codesInseeEpci: string[]): Promise<number> {
    if (codesInseeEpci.length === 0) return 0;

    const result = await db
      .select({
        count: sql<number>`cast(count(DISTINCT ${catastrophesNaturelles.codeNationalCatnat}) as integer)`,
      })
      .from(catastrophesNaturelles)
      .where(inArray(catastrophesNaturelles.codeInsee, codesInseeEpci));

    return result[0]?.count ?? 0;
  }

  /**
   * Récupère la liste des catastrophes naturelles uniques touchant un EPCI
   */
  async getUniqueCatastrophesByEpci(codesInseeEpci: string[]): Promise<CatastropheNaturelle[]> {
    if (codesInseeEpci.length === 0) return [];

    // Sous-requête pour récupérer un seul enregistrement par codeNationalCatnat
    const subquery = db
      .select({
        codeNationalCatnat: catastrophesNaturelles.codeNationalCatnat,
        minCodeInsee: sql<string>`MIN(${catastrophesNaturelles.codeInsee})`.as("min_code_insee"),
      })
      .from(catastrophesNaturelles)
      .where(inArray(catastrophesNaturelles.codeInsee, codesInseeEpci))
      .groupBy(catastrophesNaturelles.codeNationalCatnat)
      .as("subquery");

    const result = await db
      .select()
      .from(catastrophesNaturelles)
      .innerJoin(
        subquery,
        and(
          eq(catastrophesNaturelles.codeNationalCatnat, subquery.codeNationalCatnat),
          eq(catastrophesNaturelles.codeInsee, subquery.minCodeInsee)
        )
      )
      .orderBy(desc(catastrophesNaturelles.dateDebutEvt));

    return result.map((r) => r.catastrophes_naturelles);
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
