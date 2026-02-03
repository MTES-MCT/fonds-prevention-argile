import { eq, sql, SQL, desc, and, isNull, like } from "drizzle-orm";
import { db } from "../client";
import { parcoursPrevention } from "../schema/parcours-prevention";
import { users } from "../schema/users";
import { parcoursAmoValidations } from "../schema/parcours-amo-validations";
import { BaseRepository, PaginationParams, PaginationResult } from "./base.repository";
import type { ParcoursPrevention, NewParcoursPrevention } from "../schema/parcours-prevention";
import { getNextStep, Status, Step } from "@/features/parcours/core";
import { RGASimulationData } from "@/shared/domain/types";

export class ParcoursPreventionRepository extends BaseRepository<ParcoursPrevention> {
  /**
   * Trouve un parcours par ID
   */
  async findById(id: string): Promise<ParcoursPrevention | null> {
    const result = await db.select().from(parcoursPrevention).where(eq(parcoursPrevention.id, id)).limit(1);

    return result[0] || null;
  }

  /**
   * Récupère tous les parcours
   */
  async findAll(): Promise<ParcoursPrevention[]> {
    return await db.select().from(parcoursPrevention).orderBy(desc(parcoursPrevention.createdAt));
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
  async update(id: string, data: Partial<NewParcoursPrevention>): Promise<ParcoursPrevention | null> {
    const result = await db.update(parcoursPrevention).set(data).where(eq(parcoursPrevention.id, id)).returning();

    return result[0] || null;
  }

  /**
   * Supprime un parcours
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(parcoursPrevention).where(eq(parcoursPrevention.id, id)).returning();

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
    const query = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(parcoursPrevention);

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
    const result = await db.select().from(parcoursPrevention).where(eq(parcoursPrevention.userId, userId)).limit(1);

    return result[0] || null;
  }

  /**
   * Met à jour l'étape courante d'un parcours
   */
  async updateStep(id: string, step: Step, status: Status = Status.TODO): Promise<ParcoursPrevention | null> {
    return await this.update(id, {
      currentStep: step,
      currentStatus: status,
    });
  }

  /**
   * Met à jour le statut d'un parcours
   */
  async updateStatus(id: string, status: Status): Promise<ParcoursPrevention | null> {
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
  async findWithPagination(params: PaginationParams = {}): Promise<PaginationResult<ParcoursPrevention>> {
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
      .where(eq(parcoursPrevention.currentStatus, Status.EN_INSTRUCTION))
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
    return parcours.currentStatus === Status.VALIDE;
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
      if (parcours.currentStatus === Status.VALIDE && !parcours.completedAt) {
        return await this.markAsCompleted(id);
      }
      return parcours;
    }

    return await this.updateStep(id, nextStep, Status.TODO);
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
      currentStep: Step.CHOIX_AMO,
      currentStatus: Status.TODO,
    });
  }

  /**
   * Sauvegarde les données RGA du simulateur dans le parcours
   */
  async updateRGAData(parcoursId: string, rgaData: RGASimulationData): Promise<ParcoursPrevention | null> {
    return await this.update(parcoursId, {
      rgaSimulationData: rgaData,
      rgaSimulationCompletedAt: new Date(),
    });
  }

  /**
   * Récupère tous les parcours ayant des données RGA (pour dashboard admin)
   */
  async findParcoursWithRGAData(): Promise<ParcoursPrevention[]> {
    return await db
      .select()
      .from(parcoursPrevention)
      .where(sql`${parcoursPrevention.rgaSimulationData} IS NOT NULL`)
      .orderBy(desc(parcoursPrevention.rgaSimulationCompletedAt));
  }

  /**
   * Compte le nombre de parcours avec données RGA
   */
  async countWithRGAData(): Promise<number> {
    return await this.count(sql`${parcoursPrevention.rgaSimulationData} IS NOT NULL`);
  }

  /**
   * Vérifie si un parcours a des données RGA
   */
  async hasRGAData(parcoursId: string): Promise<boolean> {
    const parcours = await this.findById(parcoursId);
    return parcours?.rgaSimulationData !== null && parcours?.rgaSimulationData !== undefined;
  }

  /**
   * Récupère les parcours sans AMO pour un territoire donné (Allers-Vers)
   * Note: Le filtrage territorial complet sera implémenté quand les données de logement
   * seront disponibles dans une table dédiée ou enrichies dans rgaSimulationData
   *
   * @param departements - Codes des départements couverts (pour future implémentation)
   * @param epcis - Codes des EPCIs couverts (pour future implémentation)
   * @param filters - Filtres optionnels
   * @returns Liste des parcours prospects avec informations utilisateur
   */
  async getParcoursWithoutAmoByTerritoire(
    departements: string[],
    epcis: string[] = [],
    filters?: {
      commune?: string;
      step?: Step;
      maxDaysSinceAction?: number;
      search?: string;
    }
  ) {
    // Construire les conditions de filtre
    const conditions = [];

    // Filtres optionnels
    if (filters?.step) {
      conditions.push(eq(parcoursPrevention.currentStep, filters.step));
    }
    if (filters?.search) {
      // Recherche sur nom ou prénom (case insensitive avec ILIKE en PostgreSQL)
      conditions.push(
        sql`(LOWER(${users.prenom}) LIKE LOWER(${"%" + filters.search + "%"}) OR LOWER(${users.nom}) LIKE LOWER(${"%" + filters.search + "%"}))`
      );
    }

    // Requête principale
    const results = await db
      .select({
        // Parcours
        parcoursId: parcoursPrevention.id,
        currentStep: parcoursPrevention.currentStep,
        createdAt: parcoursPrevention.createdAt,
        updatedAt: parcoursPrevention.updatedAt,
        rgaSimulationData: parcoursPrevention.rgaSimulationData,
        // Utilisateur
        userPrenom: users.prenom,
        userNom: users.nom,
        userEmail: users.email,
      })
      .from(parcoursPrevention)
      .innerJoin(users, eq(parcoursPrevention.userId, users.id))
      .leftJoin(
        parcoursAmoValidations,
        eq(parcoursPrevention.id, parcoursAmoValidations.parcoursId)
      )
      .where(
        and(
          // Pas de validation AMO (parcours sans AMO)
          isNull(parcoursAmoValidations.id),
          // Autres filtres
          ...conditions
        )
      )
      .orderBy(desc(parcoursPrevention.updatedAt));

    // Filtrer par ancienneté et territoire côté application
    return results.filter((r) => {
      // Filtrage par ancienneté
      if (filters?.maxDaysSinceAction !== undefined) {
        const now = new Date();
        const daysSince = Math.floor(
          (now.getTime() - r.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince > filters.maxDaysSinceAction) {
          return false;
        }
      }

      // Filtrage territorial (si rgaSimulationData contient les infos)
      if (r.rgaSimulationData && (departements.length > 0 || epcis.length > 0)) {
        const logement = (r.rgaSimulationData as any)?.logement;
        if (!logement) return false;

        const codeDepartement = logement.departement;
        const codeEpci = logement.epci;

        // Au moins un match sur département ou EPCI
        const matchesDepartement = departements.length > 0 && codeDepartement && departements.includes(codeDepartement);
        const matchesEpci = epcis.length > 0 && codeEpci && epcis.includes(codeEpci);

        return matchesDepartement || matchesEpci;
      }

      // Si pas de filtrage territorial ou pas de données, inclure
      return departements.length === 0 && epcis.length === 0;
    });
  }
}

// Export d'une instance singleton
export const parcoursPreventionRepository = new ParcoursPreventionRepository();
