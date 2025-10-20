import { eq, sql, SQL, desc } from "drizzle-orm";
import { db } from "../client";
import { dossiersDemarchesSimplifiees } from "../schema/dossiers-demarches-simplifiees";
import { BaseRepository } from "./base.repository";
import type {
  DossierDemarchesSimplifiees,
  NewDossierDemarchesSimplifiees,
} from "../schema/dossiers-demarches-simplifiees";

export class DossierDemarchesSimplifieesRepository extends BaseRepository<DossierDemarchesSimplifiees> {
  /**
   * Trouve un dossier par ID
   */
  async findById(id: string): Promise<DossierDemarchesSimplifiees | null> {
    const result = await db
      .select()
      .from(dossiersDemarchesSimplifiees)
      .where(eq(dossiersDemarchesSimplifiees.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Récupère tous les dossiers
   */
  async findAll(): Promise<DossierDemarchesSimplifiees[]> {
    return await db
      .select()
      .from(dossiersDemarchesSimplifiees)
      .orderBy(desc(dossiersDemarchesSimplifiees.createdAt));
  }

  /**
   * Crée un nouveau dossier
   */
  async create(
    data: NewDossierDemarchesSimplifiees
  ): Promise<DossierDemarchesSimplifiees> {
    const result = await db
      .insert(dossiersDemarchesSimplifiees)
      .values(data)
      .returning();

    return result[0];
  }

  /**
   * Met à jour un dossier
   */
  async update(
    id: string,
    data: Partial<NewDossierDemarchesSimplifiees>
  ): Promise<DossierDemarchesSimplifiees | null> {
    const result = await db
      .update(dossiersDemarchesSimplifiees)
      .set(data)
      .where(eq(dossiersDemarchesSimplifiees.id, id))
      .returning();

    return result[0] || null;
  }

  /**
   * Supprime un dossier
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(dossiersDemarchesSimplifiees)
      .where(eq(dossiersDemarchesSimplifiees.id, id))
      .returning();

    return result.length > 0;
  }

  /**
   * Vérifie si un dossier existe
   */
  async exists(id: string): Promise<boolean> {
    const result = await db
      .select({ id: dossiersDemarchesSimplifiees.id })
      .from(dossiersDemarchesSimplifiees)
      .where(eq(dossiersDemarchesSimplifiees.id, id))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Compte le nombre de dossiers
   */
  async count(where?: SQL): Promise<number> {
    const query = db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(dossiersDemarchesSimplifiees);

    if (where) {
      query.where(where);
    }

    const result = await query;
    return result[0]?.count ?? 0;
  }

  /**
   * Trouve les dossiers d'un parcours
   */
  async findByParcoursId(
    parcoursId: string
  ): Promise<DossierDemarchesSimplifiees[]> {
    return await db
      .select()
      .from(dossiersDemarchesSimplifiees)
      .where(eq(dossiersDemarchesSimplifiees.parcoursId, parcoursId))
      .orderBy(dossiersDemarchesSimplifiees.step);
  }
}

// Export d'une instance singleton
export const dossierDemarchesSimplifieesRepository =
  new DossierDemarchesSimplifieesRepository();
