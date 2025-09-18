import { eq, sql, SQL, desc, and } from "drizzle-orm";
import { db } from "../client";
import { parcoursPrevention } from "../schema/parcours-prevention";
import {
  BaseRepository,
  PaginationParams,
  PaginationResult,
} from "./base.repository";
import type {
  ParcoursPrevention,
  NewParcoursPrevention,
} from "../schema/parcours-prevention";
import type { Step, Status } from "../types/parcours.types";
import { getNextStep, isStepAccessible } from "../utils/parcours.utils";

export class ParcoursPreventionRepository extends BaseRepository<ParcoursPrevention> {
  /**
   * Trouve un parcours par ID
   */
  async findById(id: string): Promise<ParcoursPrevention | null> {
    const result = await db
      .select()
      .from(parcoursPrevention)
      .where(eq(parcoursPrevention.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Récupère tous les parcours
   */
  async findAll(): Promise<ParcoursPrevention[]> {
    return await db
      .select()
      .from(parcoursPrevention)
      .orderBy(desc(parcoursPrevention.createdAt));
  }

  /**
   * Crée un nouveau parcours
   */
  async create(data: NewParcoursPrevention): Promise<ParcoursPrevention> {
    const result = await db.insert(parcoursPrevention).values(data).returning();

    return result[0];
  }

  /**
   * Met à jour un parcours
   */
  async update(
    id: string,
    data: Partial<NewParcoursPrevention>
  ): Promise<ParcoursPrevention | null> {
    const result = await db
      .update(parcoursPrevention)
      .set(data)
      .where(eq(parcoursPrevention.id, id))
      .returning();

    return result[0] || null;
  }

  /**
   * Supprime un parcours
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(parcoursPrevention)
      .where(eq(parcoursPrevention.id, id))
      .returning();

    return result.length > 0;
  }

  /**
   * Vérifie si un parcours existe
   */
  async exists(id: string): Promise<boolean> {
    const result = await db
      .select({ id: parcoursPrevention.id })
      .from(parcoursPrevention)
      .where(eq(parcoursPrevention.id, id))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Compte le nombre de parcours
   */
  async count(where?: SQL): Promise<number> {
    const query = db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(parcoursPrevention);

    if (where) {
      query.where(where);
    }

    const result = await query;
    return result[0]?.count ?? 0;
  }

  /**
   * Trouve le parcours unique d'un utilisateur (un seul parcours par user)
   */
  async findByUserId(userId: string): Promise<ParcoursPrevention | null> {
    const result = await db
      .select()
      .from(parcoursPrevention)
      .where(eq(parcoursPrevention.userId, userId))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Vérifie si un utilisateur a déjà un parcours
   */
  async existsForUser(userId: string): Promise<boolean> {
    const result = await db
      .select({ id: parcoursPrevention.id })
      .from(parcoursPrevention)
      .where(eq(parcoursPrevention.userId, userId))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Trouve les parcours par étape courante
   */
  async findByCurrentStep(step: Step): Promise<ParcoursPrevention[]> {
    return await db
      .select()
      .from(parcoursPrevention)
      .where(eq(parcoursPrevention.currentStep, step))
      .orderBy(desc(parcoursPrevention.updatedAt));
  }

  /**
   * Trouve les parcours par statut
   */
  async findByStatus(status: Status): Promise<ParcoursPrevention[]> {
    return await db
      .select()
      .from(parcoursPrevention)
      .where(eq(parcoursPrevention.currentStatus, status))
      .orderBy(desc(parcoursPrevention.updatedAt));
  }

  /**
   * Trouve les parcours par étape et statut
   */
  async findByStepAndStatus(
    step: Step,
    status: Status
  ): Promise<ParcoursPrevention[]> {
    return await db
      .select()
      .from(parcoursPrevention)
      .where(
        and(
          eq(parcoursPrevention.currentStep, step),
          eq(parcoursPrevention.currentStatus, status)
        )
      )
      .orderBy(desc(parcoursPrevention.updatedAt));
  }

  /**
   * Met à jour l'étape courante d'un parcours
   */
  async updateStep(
    id: string,
    step: Step,
    status: Status = "TODO"
  ): Promise<ParcoursPrevention | null> {
    return await this.update(id, {
      currentStep: step,
      currentStatus: status,
    });
  }

  /**
   * Met à jour le statut d'un parcours
   */
  async updateStatus(
    id: string,
    status: Status
  ): Promise<ParcoursPrevention | null> {
    return await this.update(id, {
      currentStatus: status,
    });
  }

  /**
   * Marque un parcours comme complété
   */
  async markAsCompleted(id: string): Promise<ParcoursPrevention | null> {
    return await this.update(id, {
      completedAt: new Date(),
    });
  }

  /**
   * Récupère les parcours avec pagination
   */
  async findWithPagination(
    params: PaginationParams = {}
  ): Promise<PaginationResult<ParcoursPrevention>> {
    const { page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;

    const data = await db
      .select()
      .from(parcoursPrevention)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(parcoursPrevention.createdAt));

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
   * Trouve les parcours en instruction
   */
  async findInProgress(): Promise<ParcoursPrevention[]> {
    return await db
      .select()
      .from(parcoursPrevention)
      .where(eq(parcoursPrevention.currentStatus, "EN_INSTRUCTION"))
      .orderBy(desc(parcoursPrevention.updatedAt));
  }

  /**
   * Trouve les parcours terminés
   */
  async findCompleted(): Promise<ParcoursPrevention[]> {
    return await db
      .select()
      .from(parcoursPrevention)
      .where(sql`${parcoursPrevention.completedAt} IS NOT NULL`)
      .orderBy(desc(parcoursPrevention.completedAt));
  }

  /**
   * Vérifie si l'utilisateur peut passer à l'étape suivante
   */
  async canProgressToNextStep(id: string): Promise<boolean> {
    const parcours = await this.findById(id);
    if (!parcours) return false;

    // Un parcours peut progresser si l'étape courante est validée
    return parcours.currentStatus === "VALIDE";
  }

  /**
   * Progresse vers l'étape suivante
   */
  async progressToNextStep(id: string): Promise<ParcoursPrevention | null> {
    const parcours = await this.findById(id);
    if (!parcours || !(await this.canProgressToNextStep(id))) {
      return null;
    }

    const nextStep = getNextStep(parcours.currentStep);

    // Si on est déjà à la dernière étape ou pas d'étape suivante
    if (!nextStep) {
      // Marquer comme complété si on valide la dernière étape
      if (parcours.currentStatus === "VALIDE" && !parcours.completedAt) {
        return await this.markAsCompleted(id);
      }
      return parcours;
    }

    return await this.updateStep(id, nextStep, "TODO");
  }

  /**
   * Vérifie si une étape est accessible pour un parcours
   */
  async isStepAccessibleForParcours(
    id: string,
    targetStep: Step
  ): Promise<boolean> {
    const parcours = await this.findById(id);
    if (!parcours) return false;

    return isStepAccessible(
      targetStep,
      parcours.currentStep,
      parcours.currentStatus
    );
  }

  /**
   * Récupère les statistiques des parcours
   */
  async getStatistics(): Promise<{
    total: number;
    byStep: Record<Step, number>;
    byStatus: Record<Status, number>;
    completed: number;
    inProgress: number;
    averageCompletionDays: number | null;
  }> {
    const [
      total,
      eligibiliteCount,
      diagnosticCount,
      devisCount,
      facturesCount,
      todoCount,
      enInstructionCount,
      valideCount,
      completed,
      inProgress,
    ] = await Promise.all([
      this.count(),
      this.count(eq(parcoursPrevention.currentStep, "ELIGIBILITE")),
      this.count(eq(parcoursPrevention.currentStep, "DIAGNOSTIC")),
      this.count(eq(parcoursPrevention.currentStep, "DEVIS")),
      this.count(eq(parcoursPrevention.currentStep, "FACTURES")),
      this.count(eq(parcoursPrevention.currentStatus, "TODO")),
      this.count(eq(parcoursPrevention.currentStatus, "EN_INSTRUCTION")),
      this.count(eq(parcoursPrevention.currentStatus, "VALIDE")),
      this.count(sql`${parcoursPrevention.completedAt} IS NOT NULL`),
      this.count(eq(parcoursPrevention.currentStatus, "EN_INSTRUCTION")),
    ]);

    // Calcul de la durée moyenne de complétion
    const avgResult = await db
      .select({
        avgDays: sql<number>`
          AVG(
            EXTRACT(EPOCH FROM (${parcoursPrevention.completedAt} - ${parcoursPrevention.createdAt})) / 86400
          )::integer
        `,
      })
      .from(parcoursPrevention)
      .where(sql`${parcoursPrevention.completedAt} IS NOT NULL`);

    return {
      total,
      byStep: {
        ELIGIBILITE: eligibiliteCount,
        DIAGNOSTIC: diagnosticCount,
        DEVIS: devisCount,
        FACTURES: facturesCount,
      },
      byStatus: {
        TODO: todoCount,
        EN_INSTRUCTION: enInstructionCount,
        VALIDE: valideCount,
      },
      completed,
      inProgress,
      averageCompletionDays: avgResult[0]?.avgDays ?? null,
    };
  }

  /**
   * Crée ou récupère le parcours unique d'un utilisateur
   */
  async findOrCreateForUser(userId: string): Promise<ParcoursPrevention> {
    const existing = await this.findByUserId(userId);

    if (existing) {
      return existing;
    }

    return await this.create({
      userId,
      currentStep: "ELIGIBILITE",
      currentStatus: "TODO",
    });
  }

  /**
   * Réinitialise un parcours à l'étape initiale
   */
  async resetParcours(id: string): Promise<ParcoursPrevention | null> {
    return await this.update(id, {
      currentStep: "ELIGIBILITE",
      currentStatus: "TODO",
      completedAt: null,
    });
  }
}

// Export d'une instance singleton
export const parcoursPreventionRepository = new ParcoursPreventionRepository();
