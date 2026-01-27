import { eq, SQL, sql } from "drizzle-orm";
import { db } from "../client";
import { allersVers, allersVersDepartements, allersVersEpci } from "../schema";
import type { NewAllersVers } from "../schema/allers-vers";
import { BaseRepository } from "./base.repository";

export type AllersVersWithRelations = {
  id: string;
  nom: string;
  emails: string[];
  telephone: string;
  adresse: string;
  departements: { codeDepartement: string }[];
  epci: { codeEpci: string }[];
};

/**
 * Repository pour les structures "Allers Vers"
 */
export class AllersVersRepository extends BaseRepository<typeof allersVers.$inferSelect> {
  /**
   * Trouve un Allers Vers par ID
   */
  async findById(id: string): Promise<typeof allersVers.$inferSelect | null> {
    const [av] = await db.select().from(allersVers).where(eq(allersVers.id, id)).limit(1);

    return av || null;
  }

  /**
   * Récupère tous les Allers Vers
   */
  async findAll(): Promise<Array<typeof allersVers.$inferSelect>> {
    return await db.select().from(allersVers).orderBy(allersVers.nom);
  }

  /**
   * Récupère tous les Allers Vers avec leurs relations (départements et EPCI)
   */
  async findAllWithRelations(): Promise<AllersVersWithRelations[]> {
    const allAvWithRelations = await db
      .select({
        id: allersVers.id,
        nom: allersVers.nom,
        emails: allersVers.emails,
        telephone: allersVers.telephone,
        adresse: allersVers.adresse,
        codeDepartement: allersVersDepartements.codeDepartement,
        codeEpci: allersVersEpci.codeEpci,
      })
      .from(allersVers)
      .leftJoin(allersVersDepartements, eq(allersVers.id, allersVersDepartements.allersVersId))
      .leftJoin(allersVersEpci, eq(allersVers.id, allersVersEpci.allersVersId))
      .orderBy(allersVers.nom);

    // Grouper par Allers Vers
    const avMap = new Map<string, AllersVersWithRelations>();

    for (const row of allAvWithRelations) {
      if (!avMap.has(row.id)) {
        avMap.set(row.id, {
          id: row.id,
          nom: row.nom,
          emails: row.emails,
          telephone: row.telephone,
          adresse: row.adresse,
          departements: [],
          epci: [],
        });
      }

      const av = avMap.get(row.id)!;

      if (row.codeDepartement && !av.departements.some((d) => d.codeDepartement === row.codeDepartement)) {
        av.departements.push({ codeDepartement: row.codeDepartement });
      }

      if (row.codeEpci && !av.epci.some((e) => e.codeEpci === row.codeEpci)) {
        av.epci.push({ codeEpci: row.codeEpci });
      }
    }

    return Array.from(avMap.values());
  }

  /**
   * Crée un nouvel Allers Vers
   */
  async create(data: Partial<typeof allersVers.$inferSelect>): Promise<typeof allersVers.$inferSelect> {
    const insertData: NewAllersVers = {
      nom: data.nom!,
      emails: data.emails!,
      telephone: data.telephone || "",
      adresse: data.adresse || "",
    };

    const [created] = await db.insert(allersVers).values(insertData).returning();

    return created;
  }

  /**
   * Met à jour un Allers Vers
   */
  async update(
    id: string,
    data: Partial<typeof allersVers.$inferSelect>
  ): Promise<typeof allersVers.$inferSelect | null> {
    const updateData: Partial<NewAllersVers> = {};

    if (data.nom !== undefined) updateData.nom = data.nom;
    if (data.emails !== undefined) updateData.emails = data.emails;
    if (data.telephone !== undefined) updateData.telephone = data.telephone || "";
    if (data.adresse !== undefined) updateData.adresse = data.adresse || "";

    const [updated] = await db.update(allersVers).set(updateData).where(eq(allersVers.id, id)).returning();

    return updated || null;
  }

  /**
   * Supprime un Allers Vers et toutes ses relations
   */
  async delete(id: string): Promise<boolean> {
    return await this.transaction(async (tx) => {
      // Supprimer les relations départements
      await tx.delete(allersVersDepartements).where(eq(allersVersDepartements.allersVersId, id));

      // Supprimer les relations EPCI
      await tx.delete(allersVersEpci).where(eq(allersVersEpci.allersVersId, id));

      // Supprimer l'Allers Vers
      const result = await tx.delete(allersVers).where(eq(allersVers.id, id)).returning();

      return result.length > 0;
    });
  }

  /**
   * Vérifie si un Allers Vers existe
   */
  async exists(id: string): Promise<boolean> {
    const result = await db.select({ id: allersVers.id }).from(allersVers).where(eq(allersVers.id, id)).limit(1);

    return result.length > 0;
  }

  /**
   * Compte le nombre d'Allers Vers
   */
  async count(where?: SQL): Promise<number> {
    const query = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(allersVers);

    if (where) {
      query.where(where);
    }

    const [result] = await query;
    return result?.count || 0;
  }

  /**
   * Met à jour les relations départements d'un Allers Vers
   */
  async updateDepartementsRelations(avId: string, codeDepartements: string[]): Promise<void> {
    await this.transaction(async (tx) => {
      // Supprimer les anciennes relations
      await tx.delete(allersVersDepartements).where(eq(allersVersDepartements.allersVersId, avId));

      // Insérer les nouvelles relations si présentes
      if (codeDepartements.length > 0) {
        await tx.insert(allersVersDepartements).values(
          codeDepartements.map((codeDepartement) => ({
            allersVersId: avId,
            codeDepartement: codeDepartement,
          }))
        );
      }
    });
  }

  /**
   * Met à jour les relations EPCI d'un Allers Vers
   */
  async updateEpciRelations(avId: string, codeEpcis: string[]): Promise<void> {
    await this.transaction(async (tx) => {
      // Supprimer les anciennes relations
      await tx.delete(allersVersEpci).where(eq(allersVersEpci.allersVersId, avId));

      // Insérer les nouvelles relations si présentes
      if (codeEpcis.length > 0) {
        await tx.insert(allersVersEpci).values(
          codeEpcis.map((codeEpci) => ({
            allersVersId: avId,
            codeEpci: codeEpci,
          }))
        );
      }
    });
  }

  /**
   * Récupère les Allers Vers qui couvrent un département
   */
  async findByDepartement(codeDepartement: string): Promise<Array<typeof allersVers.$inferSelect>> {
    return await db
      .selectDistinct({
        id: allersVers.id,
        nom: allersVers.nom,
        emails: allersVers.emails,
        telephone: allersVers.telephone,
        adresse: allersVers.adresse,
      })
      .from(allersVers)
      .innerJoin(allersVersDepartements, eq(allersVers.id, allersVersDepartements.allersVersId))
      .where(eq(allersVersDepartements.codeDepartement, codeDepartement))
      .orderBy(allersVers.nom);
  }

  /**
   * Récupère les Allers Vers qui couvrent un EPCI
   */
  async findByEpci(codeEpci: string): Promise<Array<typeof allersVers.$inferSelect>> {
    return await db
      .selectDistinct({
        id: allersVers.id,
        nom: allersVers.nom,
        emails: allersVers.emails,
        telephone: allersVers.telephone,
        adresse: allersVers.adresse,
      })
      .from(allersVers)
      .innerJoin(allersVersEpci, eq(allersVers.id, allersVersEpci.allersVersId))
      .where(eq(allersVersEpci.codeEpci, codeEpci))
      .orderBy(allersVers.nom);
  }

  /**
   * Récupère les Allers Vers avec priorité EPCI, fallback département
   *
   * Logique :
   * 1. Si l'EPCI est fourni et a des AV → retourne uniquement ceux de l'EPCI
   * 2. Sinon → retourne les AV du département
   * 3. Si aucun → retourne un tableau vide
   */
  async findByEpciWithDepartementFallback(
    codeDepartement: string,
    codeEpci?: string
  ): Promise<Array<typeof allersVers.$inferSelect>> {
    // 1. Si EPCI fourni, chercher d'abord par EPCI
    if (codeEpci) {
      const avParEpci = await this.findByEpci(codeEpci);
      if (avParEpci.length > 0) {
        return avParEpci; // Priorité EPCI
      }
    }

    // 2. Fallback département
    return await this.findByDepartement(codeDepartement);
  }
}

// Instance singleton
export const allersVersRepository = new AllersVersRepository();
