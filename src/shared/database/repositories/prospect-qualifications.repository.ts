import { eq, desc, sql, type SQL } from "drizzle-orm";
import { db } from "../client";
import { prospectQualifications } from "../schema/prospect-qualifications";
import { BaseRepository } from "./base.repository";
import type { ProspectQualification, NewProspectQualification } from "../schema/prospect-qualifications";

/**
 * Repository pour la gestion des qualifications de prospects
 */
export class ProspectQualificationsRepository extends BaseRepository<ProspectQualification> {
  /**
   * Trouve une qualification par ID
   */
  async findById(id: string): Promise<ProspectQualification | null> {
    const result = await db
      .select()
      .from(prospectQualifications)
      .where(eq(prospectQualifications.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Récupère toutes les qualifications
   */
  async findAll(): Promise<ProspectQualification[]> {
    return await db
      .select()
      .from(prospectQualifications)
      .orderBy(desc(prospectQualifications.createdAt));
  }

  /**
   * Crée une nouvelle qualification
   */
  async create(data: NewProspectQualification): Promise<ProspectQualification> {
    const result = await db.insert(prospectQualifications).values(data).returning();
    return result[0];
  }

  /**
   * Met à jour une qualification
   */
  async update(id: string, data: Partial<ProspectQualification>): Promise<ProspectQualification | null> {
    const result = await db
      .update(prospectQualifications)
      .set(data)
      .where(eq(prospectQualifications.id, id))
      .returning();

    return result[0] || null;
  }

  /**
   * Supprime une qualification
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(prospectQualifications)
      .where(eq(prospectQualifications.id, id))
      .returning();

    return result.length > 0;
  }

  /**
   * Vérifie si une qualification existe
   */
  async exists(id: string): Promise<boolean> {
    const result = await db
      .select({ id: prospectQualifications.id })
      .from(prospectQualifications)
      .where(eq(prospectQualifications.id, id))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Compte le nombre de qualifications
   */
  async count(where?: SQL): Promise<number> {
    const query = db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(prospectQualifications);

    if (where) {
      query.where(where);
    }

    const result = await query;
    return result[0]?.count ?? 0;
  }

  /**
   * Récupère toutes les qualifications d'un parcours, triées par date décroissante (la plus récente en premier)
   */
  async findByParcoursId(parcoursId: string): Promise<ProspectQualification[]> {
    return await db
      .select()
      .from(prospectQualifications)
      .where(eq(prospectQualifications.parcoursId, parcoursId))
      .orderBy(desc(prospectQualifications.createdAt));
  }

  /**
   * Récupère la dernière qualification d'un parcours (la plus récente)
   */
  async findLatestByParcoursId(parcoursId: string): Promise<ProspectQualification | null> {
    const result = await db
      .select()
      .from(prospectQualifications)
      .where(eq(prospectQualifications.parcoursId, parcoursId))
      .orderBy(desc(prospectQualifications.createdAt))
      .limit(1);

    return result[0] || null;
  }
}

// Export d'une instance singleton
export const prospectQualificationsRepo = new ProspectQualificationsRepository();
