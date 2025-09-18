import { eq, sql, SQL, desc, and } from "drizzle-orm";
import { db } from "../client";
import { dossiersDemarchesSimplifiees } from "../schema/dossiers-demarches-simplifiees";
import {
  BaseRepository,
  PaginationParams,
  PaginationResult,
} from "./base.repository";
import type {
  DossierDemarchesSimplifiees,
  NewDossierDemarchesSimplifiees,
} from "../schema/dossiers-demarches-simplifiees";
import type { Step, DSStatus } from "../types/parcours.types";
import { mapDSStatusToInternalStatus } from "../types/parcours.types";

export class DossierDemarchesSimplifieeesRepository extends BaseRepository<DossierDemarchesSimplifiees> {
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
   * Trouve un dossier par numéro DS
   */
  async findByDsNumber(
    dsNumber: string
  ): Promise<DossierDemarchesSimplifiees | null> {
    const result = await db
      .select()
      .from(dossiersDemarchesSimplifiees)
      .where(eq(dossiersDemarchesSimplifiees.dsNumber, dsNumber))
      .limit(1);

    return result[0] || null;
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

  /**
   * Trouve le dossier d'un parcours pour une étape donnée
   */
  async findByParcoursAndStep(
    parcoursId: string,
    step: Step
  ): Promise<DossierDemarchesSimplifiees | null> {
    const result = await db
      .select()
      .from(dossiersDemarchesSimplifiees)
      .where(
        and(
          eq(dossiersDemarchesSimplifiees.parcoursId, parcoursId),
          eq(dossiersDemarchesSimplifiees.step, step)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Trouve les dossiers par statut DS
   */
  async findByDsStatus(
    dsStatus: DSStatus
  ): Promise<DossierDemarchesSimplifiees[]> {
    return await db
      .select()
      .from(dossiersDemarchesSimplifiees)
      .where(eq(dossiersDemarchesSimplifiees.dsStatus, dsStatus))
      .orderBy(desc(dossiersDemarchesSimplifiees.updatedAt));
  }

  /**
   * Trouve les dossiers par démarche DS
   */
  async findByDemarcheId(
    dsDemarcheId: string
  ): Promise<DossierDemarchesSimplifiees[]> {
    return await db
      .select()
      .from(dossiersDemarchesSimplifiees)
      .where(eq(dossiersDemarchesSimplifiees.dsDemarcheId, dsDemarcheId))
      .orderBy(desc(dossiersDemarchesSimplifiees.createdAt));
  }

  /**
   * Met à jour le statut DS d'un dossier
   */
  async updateDsStatus(
    id: string,
    dsStatus: DSStatus
  ): Promise<DossierDemarchesSimplifiees | null> {
    const updateData: Partial<NewDossierDemarchesSimplifiees> = {
      dsStatus,
      lastSyncAt: new Date(),
    };

    // Si le dossier passe à "accepte", on met à jour processedAt
    if (dsStatus === "accepte") {
      updateData.processedAt = new Date();
    }

    return await this.update(id, updateData);
  }

  /**
   * Met à jour les infos de synchronisation DS
   */
  async updateFromDS(
    id: string,
    data: {
      dsNumber?: string;
      dsId?: string;
      dsStatus: DSStatus;
      dsUrl?: string;
      submittedAt?: Date;
      processedAt?: Date;
    }
  ): Promise<DossierDemarchesSimplifiees | null> {
    return await this.update(id, {
      ...data,
      lastSyncAt: new Date(),
    });
  }

  /**
   * Marque un dossier comme soumis
   */
  async markAsSubmitted(
    id: string,
    dsNumber: string,
    dsUrl?: string
  ): Promise<DossierDemarchesSimplifiees | null> {
    return await this.update(id, {
      dsNumber,
      dsUrl,
      submittedAt: new Date(),
      dsStatus: "en_construction",
    });
  }

  /**
   * Trouve les dossiers à synchroniser
   */
  async findToSync(
    hoursThreshold: number = 1
  ): Promise<DossierDemarchesSimplifiees[]> {
    const dateThreshold = new Date();
    dateThreshold.setHours(dateThreshold.getHours() - hoursThreshold);

    return await db
      .select()
      .from(dossiersDemarchesSimplifiees)
      .where(
        and(
          // Dossiers soumis mais pas terminés
          sql`${dossiersDemarchesSimplifiees.dsNumber} IS NOT NULL`,
          sql`${dossiersDemarchesSimplifiees.dsStatus} NOT IN ('accepte', 'refuse', 'classe_sans_suite')`,
          // Et qui n'ont pas été synchronisés récemment
          sql`${dossiersDemarchesSimplifiees.lastSyncAt} IS NULL OR ${dossiersDemarchesSimplifiees.lastSyncAt} < ${dateThreshold}`
        )
      )
      .orderBy(dossiersDemarchesSimplifiees.lastSyncAt);
  }

  /**
   * Récupère les dossiers avec pagination
   */
  async findWithPagination(
    params: PaginationParams = {}
  ): Promise<PaginationResult<DossierDemarchesSimplifiees>> {
    const { page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;

    const data = await db
      .select()
      .from(dossiersDemarchesSimplifiees)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(dossiersDemarchesSimplifiees.createdAt));

    const total = await this.count();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Compte les dossiers par statut pour un parcours
   */
  async countByStatusForParcours(
    parcoursId: string
  ): Promise<Record<DSStatus, number>> {
    const dossiers = await this.findByParcoursId(parcoursId);

    const counts: Record<DSStatus, number> = {
      en_construction: 0,
      en_instruction: 0,
      accepte: 0,
      refuse: 0,
      classe_sans_suite: 0,
    };

    dossiers.forEach((dossier) => {
      counts[dossier.dsStatus]++;
    });

    return counts;
  }

  /**
   * Récupère les statistiques des dossiers
   * TODO : Définir & optimiser les statistiques nécessaires
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<DSStatus, number>;
    byStep: Record<Step, number>;
    submitted: number;
    pending: number;
    processed: number;
    averageProcessingDays: number | null;
  }> {
    const [
      total,
      enConstructionCount,
      enInstructionCount,
      accepteCount,
      refuseCount,
      classeSansSuiteCount,
      eligibiliteCount,
      diagnosticCount,
      devisCount,
      facturesCount,
    ] = await Promise.all([
      this.count(),
      this.count(eq(dossiersDemarchesSimplifiees.dsStatus, "en_construction")),
      this.count(eq(dossiersDemarchesSimplifiees.dsStatus, "en_instruction")),
      this.count(eq(dossiersDemarchesSimplifiees.dsStatus, "accepte")),
      this.count(eq(dossiersDemarchesSimplifiees.dsStatus, "refuse")),
      this.count(
        eq(dossiersDemarchesSimplifiees.dsStatus, "classe_sans_suite")
      ),
      this.count(eq(dossiersDemarchesSimplifiees.step, "ELIGIBILITE")),
      this.count(eq(dossiersDemarchesSimplifiees.step, "DIAGNOSTIC")),
      this.count(eq(dossiersDemarchesSimplifiees.step, "DEVIS")),
      this.count(eq(dossiersDemarchesSimplifiees.step, "FACTURES")),
    ]);

    // Comptage des dossiers soumis, en attente et traités
    const [submitted, pending, processed] = await Promise.all([
      this.count(sql`${dossiersDemarchesSimplifiees.submittedAt} IS NOT NULL`),
      this.count(
        sql`${dossiersDemarchesSimplifiees.dsStatus} IN ('en_construction', 'en_instruction')`
      ),
      this.count(
        sql`${dossiersDemarchesSimplifiees.dsStatus} IN ('accepte', 'refuse', 'classe_sans_suite')`
      ),
    ]);

    // Calcul de la durée moyenne de traitement
    const avgResult = await db
      .select({
        avgDays: sql<number>`
          AVG(
            EXTRACT(EPOCH FROM (${dossiersDemarchesSimplifiees.processedAt} - ${dossiersDemarchesSimplifiees.submittedAt})) / 86400
          )::integer
        `,
      })
      .from(dossiersDemarchesSimplifiees)
      .where(
        and(
          sql`${dossiersDemarchesSimplifiees.submittedAt} IS NOT NULL`,
          sql`${dossiersDemarchesSimplifiees.processedAt} IS NOT NULL`
        )
      );

    return {
      total,
      byStatus: {
        en_construction: enConstructionCount,
        en_instruction: enInstructionCount,
        accepte: accepteCount,
        refuse: refuseCount,
        classe_sans_suite: classeSansSuiteCount,
      },
      byStep: {
        ELIGIBILITE: eligibiliteCount,
        DIAGNOSTIC: diagnosticCount,
        DEVIS: devisCount,
        FACTURES: facturesCount,
      },
      submitted,
      pending,
      processed,
      averageProcessingDays: avgResult[0]?.avgDays ?? null,
    };
  }

  /**
   * Obtient le statut interne correspondant au statut DS
   */
  getInternalStatus(
    dsStatus: DSStatus
  ): ReturnType<typeof mapDSStatusToInternalStatus> {
    return mapDSStatusToInternalStatus(dsStatus);
  }
}

// Export d'une instance singleton
export const dossierDemarchesSimplifieeesRepository =
  new DossierDemarchesSimplifieeesRepository();
