import { eq, desc, sql, and, gte, lte, inArray, type SQL } from "drizzle-orm";
import { db } from "../client";
import { parcoursActions } from "../schema/parcours-actions";
import { agents } from "../schema/agents";
import { entreprisesAmo } from "../schema/entreprises-amo";
import { allersVers } from "../schema/allers-vers";
import { parcoursPrevention } from "../schema/parcours-prevention";
import { users } from "../schema/users";
import { BaseRepository } from "./base.repository";
import type { ParcoursAction, NewParcoursAction } from "../schema/parcours-actions";
import type { ActionDetail, StructureType } from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import type { CommentaireAdminDetail } from "@/features/backoffice/administration/commentaires/domain/types/commentaire-admin.types";

/** Dernière action d'un parcours (pour le tableau de suivi) */
export interface DerniereActionRow {
  actionType: string;
  message: string | null;
  createdAt: Date;
}

/**
 * Repository pour la gestion des actions réalisées sur les parcours
 */
export class ParcoursActionsRepository extends BaseRepository<ParcoursAction> {
  /**
   * Trouve une action par ID
   */
  async findById(id: string): Promise<ParcoursAction | null> {
    const result = await db.select().from(parcoursActions).where(eq(parcoursActions.id, id)).limit(1);

    return result[0] || null;
  }

  /**
   * Récupère toutes les actions (rarement utilisé)
   */
  async findAll(): Promise<ParcoursAction[]> {
    return await db.select().from(parcoursActions).orderBy(desc(parcoursActions.createdAt));
  }

  /**
   * Crée une nouvelle action
   */
  async create(data: NewParcoursAction): Promise<ParcoursAction> {
    const result = await db.insert(parcoursActions).values(data).returning();
    return result[0];
  }

  /**
   * Met à jour une action avec des données partielles (interface BaseRepository)
   */
  async update(id: string, data: Partial<ParcoursAction>): Promise<ParcoursAction | null> {
    const result = await db.update(parcoursActions).set(data).where(eq(parcoursActions.id, id)).returning();

    return result[0] || null;
  }

  /**
   * Met à jour le commentaire (message) d'une action
   */
  async updateMessage(id: string, message: string): Promise<ParcoursAction | null> {
    return this.update(id, {
      message,
      editedAt: new Date(),
    });
  }

  /**
   * Supprime une action
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(parcoursActions).where(eq(parcoursActions.id, id)).returning();

    return result.length > 0;
  }

  /**
   * Vérifie si une action existe
   */
  async exists(id: string): Promise<boolean> {
    const result = await db
      .select({ id: parcoursActions.id })
      .from(parcoursActions)
      .where(eq(parcoursActions.id, id))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Compte le nombre d'actions
   */
  async count(where?: SQL): Promise<number> {
    const query = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(parcoursActions);

    if (where) {
      query.where(where);
    }

    const result = await query;
    return result[0]?.count ?? 0;
  }

  /**
   * Récupère toutes les actions d'un parcours avec les détails de l'agent
   * Tri par date de création (du plus ancien au plus récent)
   * Si l'agent a été supprimé, utilise les colonnes snapshot (authorName, authorStructure, authorStructureType)
   */
  async findByParcoursId(parcoursId: string): Promise<ActionDetail[]> {
    const results = await db
      .select({
        action: parcoursActions,
        agent: agents,
        entrepriseAmo: entreprisesAmo,
        allersVers: allersVers,
      })
      .from(parcoursActions)
      .leftJoin(agents, eq(parcoursActions.agentId, agents.id))
      .leftJoin(entreprisesAmo, eq(agents.entrepriseAmoId, entreprisesAmo.id))
      .leftJoin(allersVers, eq(agents.allersVersId, allersVers.id))
      .where(eq(parcoursActions.parcoursId, parcoursId))
      .orderBy(parcoursActions.createdAt); // Du plus ancien au plus récent

    return results.map((row) => this.mapRowToActionDetail(row));
  }

  /**
   * Récupère une action avec ses détails complets
   * Si l'agent a été supprimé, utilise les colonnes snapshot
   */
  async findByIdWithDetails(id: string): Promise<ActionDetail | null> {
    const results = await db
      .select({
        action: parcoursActions,
        agent: agents,
        entrepriseAmo: entreprisesAmo,
        allersVers: allersVers,
      })
      .from(parcoursActions)
      .leftJoin(agents, eq(parcoursActions.agentId, agents.id))
      .leftJoin(entreprisesAmo, eq(agents.entrepriseAmoId, entreprisesAmo.id))
      .leftJoin(allersVers, eq(agents.allersVersId, allersVers.id))
      .where(eq(parcoursActions.id, id))
      .limit(1);

    if (results.length === 0) return null;

    return this.mapRowToActionDetail(results[0]);
  }

  /**
   * Vérifie si un agent peut modifier une action (ownership)
   */
  async canEditAction(actionId: string, agentId: string): Promise<boolean> {
    const result = await db
      .select({ id: parcoursActions.id })
      .from(parcoursActions)
      .where(and(eq(parcoursActions.id, actionId), eq(parcoursActions.agentId, agentId)))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Compte le nombre d'actions pour un parcours
   */
  async countByParcoursId(parcoursId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(parcoursActions)
      .where(eq(parcoursActions.parcoursId, parcoursId));

    return result[0]?.count ?? 0;
  }

  /**
   * Recupere toutes les actions avec details demandeur, filtres et pagines (vue admin)
   * Utilise les colonnes snapshot (authorName, authorStructure, authorStructureType)
   */
  async findAllWithDetails(params: {
    limit: number;
    offset: number;
    dateDebut?: Date;
    dateFin?: Date;
    authorStructureType?: string;
    searchQuery?: string;
  }): Promise<{ items: CommentaireAdminDetail[]; totalCount: number }> {
    const conditions: SQL[] = [];

    if (params.dateDebut) {
      conditions.push(gte(parcoursActions.createdAt, params.dateDebut));
    }
    if (params.dateFin) {
      conditions.push(lte(parcoursActions.createdAt, params.dateFin));
    }
    if (params.authorStructureType) {
      conditions.push(eq(parcoursActions.authorStructureType, params.authorStructureType));
    }
    if (params.searchQuery) {
      conditions.push(
        sql`(LOWER(${parcoursActions.authorName}) LIKE LOWER(${"%" + params.searchQuery + "%"}) OR LOWER(${users.nom}) LIKE LOWER(${"%" + params.searchQuery + "%"}) OR LOWER(${users.prenom}) LIKE LOWER(${"%" + params.searchQuery + "%"}))`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count
    const countQuery = db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(parcoursActions)
      .innerJoin(parcoursPrevention, eq(parcoursActions.parcoursId, parcoursPrevention.id))
      .leftJoin(users, eq(parcoursPrevention.userId, users.id));

    if (whereClause) {
      countQuery.where(whereClause);
    }

    const countResult = await countQuery;
    const totalCount = countResult[0]?.count ?? 0;

    // Items
    const itemsQuery = db
      .select({
        id: parcoursActions.id,
        parcoursId: parcoursActions.parcoursId,
        message: parcoursActions.message,
        createdAt: parcoursActions.createdAt,
        editedAt: parcoursActions.editedAt,
        authorName: parcoursActions.authorName,
        authorStructure: parcoursActions.authorStructure,
        authorStructureType: parcoursActions.authorStructureType,
        demandeurNom: users.nom,
        demandeurPrenom: users.prenom,
      })
      .from(parcoursActions)
      .innerJoin(parcoursPrevention, eq(parcoursActions.parcoursId, parcoursPrevention.id))
      .leftJoin(users, eq(parcoursPrevention.userId, users.id))
      .orderBy(desc(parcoursActions.createdAt))
      .limit(params.limit)
      .offset(params.offset);

    if (whereClause) {
      itemsQuery.where(whereClause);
    }

    const rows = await itemsQuery;

    const items: CommentaireAdminDetail[] = rows.map((row) => ({
      id: row.id,
      parcoursId: row.parcoursId,
      message: row.message,
      createdAt: row.createdAt,
      editedAt: row.editedAt,
      authorName: row.authorName,
      authorStructure: row.authorStructure,
      authorStructureType: row.authorStructureType as StructureType | null,
      demandeur: {
        nom: row.demandeurNom,
        prenom: row.demandeurPrenom,
      },
    }));

    return { items, totalCount };
  }

  /**
   * Transforme une ligne de résultat SQL en ActionDetail
   * Gère le cas où l'agent a été supprimé (fallback sur les colonnes snapshot)
   */
  private mapRowToActionDetail(row: {
    action: typeof parcoursActions.$inferSelect;
    agent: typeof agents.$inferSelect | null;
    entrepriseAmo: typeof entreprisesAmo.$inferSelect | null;
    allersVers: typeof allersVers.$inferSelect | null;
  }): ActionDetail {
    const base = {
      id: row.action.id,
      parcoursId: row.action.parcoursId,
      actionType: row.action.actionType,
      actionPrecision: row.action.actionPrecision,
      message: row.action.message,
      createdAt: row.action.createdAt,
      updatedAt: row.action.updatedAt,
      editedAt: row.action.editedAt,
    };

    // Si l'agent existe encore, utiliser ses données live
    if (row.agent) {
      const { structureType, structureName } = this.determineStructure(row.entrepriseAmo, row.allersVers);

      return {
        ...base,
        agent: {
          id: row.agent.id,
          givenName: row.agent.givenName,
          usualName: row.agent.usualName,
          role: row.agent.role,
          structureType,
          structureName,
        },
      };
    }

    // Agent supprimé → utiliser les colonnes snapshot
    const snapshotName = row.action.authorName;
    const nameParts = snapshotName.split(" ");
    const givenName = nameParts[0];
    const usualName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

    return {
      ...base,
      agent: {
        id: null,
        givenName,
        usualName,
        role: null,
        structureType: (row.action.authorStructureType as StructureType) || "ADMINISTRATION",
        structureName: row.action.authorStructure || null,
      },
    };
  }

  /**
   * Détermine le type de structure et son nom à partir des données jointes
   */
  private determineStructure(
    entrepriseAmo: typeof entreprisesAmo.$inferSelect | null,
    allersVersStruct: typeof allersVers.$inferSelect | null
  ): { structureType: StructureType; structureName: string | null } {
    if (entrepriseAmo) {
      return {
        structureType: "AMO",
        structureName: entrepriseAmo.nom,
      };
    }

    if (allersVersStruct) {
      return {
        structureType: "ALLERS_VERS",
        structureName: allersVersStruct.nom,
      };
    }

    // Admin ou Super Admin sans structure spécifique
    return {
      structureType: "ADMINISTRATION",
      structureName: null,
    };
  }

  /**
   * Retourne la dernière action par parcoursId, pour une liste de parcoursIds.
   * Une seule requête, déduplication côté JS sur la version la plus récente.
   */
  async getLastActionByParcoursIds(parcoursIds: string[]): Promise<Map<string, DerniereActionRow>> {
    const result = new Map<string, DerniereActionRow>();
    if (parcoursIds.length === 0) return result;

    const rows = await db
      .select({
        parcoursId: parcoursActions.parcoursId,
        actionType: parcoursActions.actionType,
        message: parcoursActions.message,
        createdAt: parcoursActions.createdAt,
      })
      .from(parcoursActions)
      .where(inArray(parcoursActions.parcoursId, parcoursIds))
      .orderBy(desc(parcoursActions.createdAt));

    // Premier rencontré = le plus récent grâce au ORDER BY DESC.
    for (const row of rows) {
      if (!result.has(row.parcoursId)) {
        result.set(row.parcoursId, {
          actionType: row.actionType,
          message: row.message,
          createdAt: row.createdAt,
        });
      }
    }
    return result;
  }
}

// Export d'une instance singleton
export const parcoursActionsRepo = new ParcoursActionsRepository();
