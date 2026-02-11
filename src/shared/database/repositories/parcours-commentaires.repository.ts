import { eq, desc, sql, and, type SQL } from "drizzle-orm";
import { db } from "../client";
import { parcoursCommentaires } from "../schema/parcours-commentaires";
import { agents } from "../schema/agents";
import { entreprisesAmo } from "../schema/entreprises-amo";
import { allersVers } from "../schema/allers-vers";
import { BaseRepository } from "./base.repository";
import type { ParcoursCommentaire, NewParcoursCommentaire } from "../schema/parcours-commentaires";
import type { CommentaireDetail, StructureType } from "@/features/backoffice/espace-agent/shared/domain/types/commentaire.types";

/**
 * Repository pour la gestion des commentaires internes sur les parcours
 */
export class ParcoursCommentairesRepository extends BaseRepository<ParcoursCommentaire> {
  /**
   * Trouve un commentaire par ID
   */
  async findById(id: string): Promise<ParcoursCommentaire | null> {
    const result = await db
      .select()
      .from(parcoursCommentaires)
      .where(eq(parcoursCommentaires.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Récupère tous les commentaires (rarement utilisé)
   */
  async findAll(): Promise<ParcoursCommentaire[]> {
    return await db
      .select()
      .from(parcoursCommentaires)
      .orderBy(desc(parcoursCommentaires.createdAt));
  }

  /**
   * Crée un nouveau commentaire
   */
  async create(data: NewParcoursCommentaire): Promise<ParcoursCommentaire> {
    const result = await db.insert(parcoursCommentaires).values(data).returning();
    return result[0];
  }

  /**
   * Met à jour un commentaire avec des données partielles (interface BaseRepository)
   */
  async update(id: string, data: Partial<ParcoursCommentaire>): Promise<ParcoursCommentaire | null> {
    const result = await db
      .update(parcoursCommentaires)
      .set(data)
      .where(eq(parcoursCommentaires.id, id))
      .returning();

    return result[0] || null;
  }

  /**
   * Met à jour le message d'un commentaire
   */
  async updateMessage(id: string, message: string): Promise<ParcoursCommentaire | null> {
    return this.update(id, {
      message,
      editedAt: new Date(),
    });
  }

  /**
   * Supprime un commentaire
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(parcoursCommentaires)
      .where(eq(parcoursCommentaires.id, id))
      .returning();

    return result.length > 0;
  }

  /**
   * Vérifie si un commentaire existe
   */
  async exists(id: string): Promise<boolean> {
    const result = await db
      .select({ id: parcoursCommentaires.id })
      .from(parcoursCommentaires)
      .where(eq(parcoursCommentaires.id, id))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Compte le nombre de commentaires
   */
  async count(where?: SQL): Promise<number> {
    const query = db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(parcoursCommentaires);

    if (where) {
      query.where(where);
    }

    const result = await query;
    return result[0]?.count ?? 0;
  }

  /**
   * Récupère tous les commentaires d'un parcours avec les détails de l'agent
   * Tri par date de création (du plus ancien au plus récent)
   * Si l'agent a été supprimé, utilise les colonnes snapshot (authorName, authorStructure, authorStructureType)
   */
  async findByParcoursId(parcoursId: string): Promise<CommentaireDetail[]> {
    const results = await db
      .select({
        // Commentaire
        commentaire: parcoursCommentaires,
        // Agent (peut être null si supprimé)
        agent: agents,
        // Structures (optionnelles)
        entrepriseAmo: entreprisesAmo,
        allersVers: allersVers,
      })
      .from(parcoursCommentaires)
      .leftJoin(agents, eq(parcoursCommentaires.agentId, agents.id))
      .leftJoin(entreprisesAmo, eq(agents.entrepriseAmoId, entreprisesAmo.id))
      .leftJoin(allersVers, eq(agents.allersVersId, allersVers.id))
      .where(eq(parcoursCommentaires.parcoursId, parcoursId))
      .orderBy(parcoursCommentaires.createdAt); // Du plus ancien au plus récent

    // Transformer en CommentaireDetail
    return results.map((row) => this.mapRowToCommentaireDetail(row));
  }

  /**
   * Récupère un commentaire avec ses détails complets
   * Si l'agent a été supprimé, utilise les colonnes snapshot
   */
  async findByIdWithDetails(id: string): Promise<CommentaireDetail | null> {
    const results = await db
      .select({
        commentaire: parcoursCommentaires,
        agent: agents,
        entrepriseAmo: entreprisesAmo,
        allersVers: allersVers,
      })
      .from(parcoursCommentaires)
      .leftJoin(agents, eq(parcoursCommentaires.agentId, agents.id))
      .leftJoin(entreprisesAmo, eq(agents.entrepriseAmoId, entreprisesAmo.id))
      .leftJoin(allersVers, eq(agents.allersVersId, allersVers.id))
      .where(eq(parcoursCommentaires.id, id))
      .limit(1);

    if (results.length === 0) return null;

    return this.mapRowToCommentaireDetail(results[0]);
  }

  /**
   * Vérifie si un agent peut modifier un commentaire (ownership)
   */
  async canEditComment(commentaireId: string, agentId: string): Promise<boolean> {
    const result = await db
      .select({ id: parcoursCommentaires.id })
      .from(parcoursCommentaires)
      .where(
        and(
          eq(parcoursCommentaires.id, commentaireId),
          eq(parcoursCommentaires.agentId, agentId)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Compte le nombre de commentaires pour un parcours
   */
  async countByParcoursId(parcoursId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(parcoursCommentaires)
      .where(eq(parcoursCommentaires.parcoursId, parcoursId));

    return result[0]?.count ?? 0;
  }

  /**
   * Transforme une ligne de résultat SQL en CommentaireDetail
   * Gère le cas où l'agent a été supprimé (fallback sur les colonnes snapshot)
   */
  private mapRowToCommentaireDetail(row: {
    commentaire: typeof parcoursCommentaires.$inferSelect;
    agent: typeof agents.$inferSelect | null;
    entrepriseAmo: typeof entreprisesAmo.$inferSelect | null;
    allersVers: typeof allersVers.$inferSelect | null;
  }): CommentaireDetail {
    // Si l'agent existe encore, utiliser ses données live
    if (row.agent) {
      const { structureType, structureName } = this.determineStructure(
        row.entrepriseAmo,
        row.allersVers
      );

      return {
        id: row.commentaire.id,
        parcoursId: row.commentaire.parcoursId,
        message: row.commentaire.message,
        createdAt: row.commentaire.createdAt,
        updatedAt: row.commentaire.updatedAt,
        editedAt: row.commentaire.editedAt,
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
    const snapshotName = row.commentaire.authorName;
    // Extraire givenName / usualName depuis authorName
    const nameParts = snapshotName.split(" ");
    const givenName = nameParts[0];
    const usualName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

    return {
      id: row.commentaire.id,
      parcoursId: row.commentaire.parcoursId,
      message: row.commentaire.message,
      createdAt: row.commentaire.createdAt,
      updatedAt: row.commentaire.updatedAt,
      editedAt: row.commentaire.editedAt,
      agent: {
        id: null,
        givenName,
        usualName,
        role: null,
        structureType: (row.commentaire.authorStructureType as StructureType) || "ADMINISTRATION",
        structureName: row.commentaire.authorStructure || null,
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
}

// Export d'une instance singleton
export const parcoursCommentairesRepo = new ParcoursCommentairesRepository();
