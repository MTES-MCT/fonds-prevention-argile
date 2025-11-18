import { eq, like, or, SQL, sql } from "drizzle-orm"; // Ajouter sql
import { db } from "../client";
import { entreprisesAmo, entreprisesAmoCommunes, entreprisesAmoEpci } from "../schema";
import type { NewEntrepriseAmo } from "../schema/entreprises-amo";
import { BaseRepository } from "./base.repository";
import type { Amo } from "@/features/parcours/amo/domain/entities";

/**
 * Repository pour les entreprises AMO
 */
export class EntreprisesAmoRepository extends BaseRepository<Amo> {
  /**
   * Trouve une AMO par ID
   */
  async findById(id: string): Promise<Amo | null> {
    const [amo] = await db.select().from(entreprisesAmo).where(eq(entreprisesAmo.id, id)).limit(1);

    return amo || null;
  }

  /**
   * Récupère toutes les AMO
   */
  async findAll(): Promise<Amo[]> {
    return await db.select().from(entreprisesAmo).orderBy(entreprisesAmo.nom);
  }

  /**
   * Récupère toutes les AMO avec leurs relations (communes et EPCI)
   */
  async findAllWithRelations(): Promise<
    Array<
      Amo & {
        communes: { codeInsee: string }[];
        epci: { codeEpci: string }[];
      }
    >
  > {
    const allAmosWithRelations = await db
      .select({
        id: entreprisesAmo.id,
        nom: entreprisesAmo.nom,
        siret: entreprisesAmo.siret,
        departements: entreprisesAmo.departements,
        emails: entreprisesAmo.emails,
        telephone: entreprisesAmo.telephone,
        adresse: entreprisesAmo.adresse,
        codeInsee: entreprisesAmoCommunes.codeInsee,
        codeEpci: entreprisesAmoEpci.codeEpci,
      })
      .from(entreprisesAmo)
      .leftJoin(entreprisesAmoCommunes, eq(entreprisesAmo.id, entreprisesAmoCommunes.entrepriseAmoId))
      .leftJoin(entreprisesAmoEpci, eq(entreprisesAmo.id, entreprisesAmoEpci.entrepriseAmoId))
      .orderBy(entreprisesAmo.nom);

    // Grouper par AMO
    const amosMap = new Map<
      string,
      Amo & {
        communes: { codeInsee: string }[];
        epci: { codeEpci: string }[];
      }
    >();

    for (const row of allAmosWithRelations) {
      if (!amosMap.has(row.id)) {
        amosMap.set(row.id, {
          id: row.id,
          nom: row.nom,
          siret: row.siret,
          departements: row.departements,
          emails: row.emails,
          telephone: row.telephone,
          adresse: row.adresse,
          communes: [],
          epci: [],
        });
      }

      const amo = amosMap.get(row.id)!;

      if (row.codeInsee && !amo.communes.some((c) => c.codeInsee === row.codeInsee)) {
        amo.communes.push({ codeInsee: row.codeInsee });
      }

      if (row.codeEpci && !amo.epci.some((e) => e.codeEpci === row.codeEpci)) {
        amo.epci.push({ codeEpci: row.codeEpci });
      }
    }

    return Array.from(amosMap.values());
  }

  /**
   * Crée une nouvelle AMO
   */
  async create(data: Partial<Amo>): Promise<Amo> {
    const insertData: NewEntrepriseAmo = {
      nom: data.nom!,
      siret: data.siret || "",
      departements: data.departements!,
      emails: data.emails!,
      telephone: data.telephone || "",
      adresse: data.adresse || "",
    };

    const [created] = await db.insert(entreprisesAmo).values(insertData).returning();

    return created;
  }

  /**
   * Met à jour une AMO
   */
  async update(id: string, data: Partial<Amo>): Promise<Amo | null> {
    const updateData: Partial<NewEntrepriseAmo> = {};

    if (data.nom !== undefined) updateData.nom = data.nom;
    // Ne pas permettre de mettre à jour le SIRET via cette méthode (clé unique)
    if (data.departements !== undefined) updateData.departements = data.departements;
    if (data.emails !== undefined) updateData.emails = data.emails;
    if (data.telephone !== undefined) updateData.telephone = data.telephone || "";
    if (data.adresse !== undefined) updateData.adresse = data.adresse || "";

    const [updated] = await db.update(entreprisesAmo).set(updateData).where(eq(entreprisesAmo.id, id)).returning();

    return updated || null;
  }

  /**
   * Supprime une AMO et toutes ses relations
   */
  async delete(id: string): Promise<boolean> {
    return await this.transaction(async (tx) => {
      // Supprimer les relations communes
      await tx.delete(entreprisesAmoCommunes).where(eq(entreprisesAmoCommunes.entrepriseAmoId, id));

      // Supprimer les relations EPCI
      await tx.delete(entreprisesAmoEpci).where(eq(entreprisesAmoEpci.entrepriseAmoId, id));

      // Supprimer l'AMO
      const result = await tx.delete(entreprisesAmo).where(eq(entreprisesAmo.id, id)).returning();

      return result.length > 0;
    });
  }

  /**
   * Vérifie si une AMO existe
   */
  async exists(id: string): Promise<boolean> {
    const result = await db
      .select({ id: entreprisesAmo.id })
      .from(entreprisesAmo)
      .where(eq(entreprisesAmo.id, id))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Compte le nombre d'AMO
   */
  async count(where?: SQL): Promise<number> {
    const query = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(entreprisesAmo);

    if (where) {
      query.where(where);
    }

    const [result] = await query;
    return result?.count || 0;
  }

  /**
   * Met à jour les relations communes d'une AMO
   */
  async updateCommunesRelations(amoId: string, codeInsees: string[]): Promise<void> {
    await this.transaction(async (tx) => {
      // Supprimer les anciennes relations
      await tx.delete(entreprisesAmoCommunes).where(eq(entreprisesAmoCommunes.entrepriseAmoId, amoId));

      // Insérer les nouvelles relations si présentes
      if (codeInsees.length > 0) {
        await tx.insert(entreprisesAmoCommunes).values(
          codeInsees.map((codeInsee) => ({
            entrepriseAmoId: amoId,
            codeInsee: codeInsee,
          }))
        );
      }
    });
  }

  /**
   * Met à jour les relations EPCI d'une AMO
   */
  async updateEpciRelations(amoId: string, codeEpcis: string[]): Promise<void> {
    await this.transaction(async (tx) => {
      // Supprimer les anciennes relations
      await tx.delete(entreprisesAmoEpci).where(eq(entreprisesAmoEpci.entrepriseAmoId, amoId));

      // Insérer les nouvelles relations si présentes
      if (codeEpcis.length > 0) {
        await tx.insert(entreprisesAmoEpci).values(
          codeEpcis.map((codeEpci) => ({
            entrepriseAmoId: amoId,
            codeEpci: codeEpci,
          }))
        );
      }
    });
  }

  /**
   * Récupère les AMO qui couvrent un code INSEE
   */
  async findByCodeInsee(codeInsee: string, codeDepartement: string): Promise<Amo[]> {
    // AMO avec le code INSEE spécifique
    const amosParCodeInsee = await db
      .selectDistinct({
        id: entreprisesAmo.id,
        nom: entreprisesAmo.nom,
        siret: entreprisesAmo.siret,
        departements: entreprisesAmo.departements,
        emails: entreprisesAmo.emails,
        telephone: entreprisesAmo.telephone,
        adresse: entreprisesAmo.adresse,
      })
      .from(entreprisesAmo)
      .innerJoin(entreprisesAmoCommunes, eq(entreprisesAmo.id, entreprisesAmoCommunes.entrepriseAmoId))
      .where(eq(entreprisesAmoCommunes.codeInsee, codeInsee));

    // AMO qui couvrent le département entier
    const amosParDepartement = await db
      .select({
        id: entreprisesAmo.id,
        nom: entreprisesAmo.nom,
        siret: entreprisesAmo.siret,
        departements: entreprisesAmo.departements,
        emails: entreprisesAmo.emails,
        telephone: entreprisesAmo.telephone,
        adresse: entreprisesAmo.adresse,
      })
      .from(entreprisesAmo)
      .where(like(entreprisesAmo.departements, `%${codeDepartement}%`));

    // Fusionner et dédupliquer
    const amosMap = new Map<string, Amo>();

    for (const amo of [...amosParCodeInsee, ...amosParDepartement]) {
      if (!amosMap.has(amo.id)) {
        amosMap.set(amo.id, amo);
      }
    }

    return Array.from(amosMap.values());
  }

  /**
   * Vérifie qu'une AMO couvre un code INSEE
   */
  async checkCoversCodeInsee(amoId: string, codeInsee: string, codeDepartement: string): Promise<boolean> {
    const result = await db
      .select({ id: entreprisesAmo.id })
      .from(entreprisesAmo)
      .leftJoin(entreprisesAmoCommunes, eq(entreprisesAmo.id, entreprisesAmoCommunes.entrepriseAmoId))
      .where(
        this.createAndConditions(
          eq(entreprisesAmo.id, amoId),
          or(eq(entreprisesAmoCommunes.codeInsee, codeInsee), like(entreprisesAmo.departements, `%${codeDepartement}%`))
        )
      )
      .limit(1);

    return result.length > 0;
  }
}

// Instance singleton
export const entreprisesAmoRepository = new EntreprisesAmoRepository();
