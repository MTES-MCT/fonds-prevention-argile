import { and, eq } from "drizzle-orm";
import { db } from "../client";
import { agentPermissions, type AgentPermission, type NewAgentPermission } from "../schema/agent-permissions";

/**
 * Repository pour gérer les permissions géographiques des agents
 *
 * TODO: Cette structure est temporaire et va évoluer
 * - Actuellement : restriction par département(s)
 * - À venir : région, national, combinaisons, etc.
 */
export class AgentPermissionsRepository {
  /**
   * Récupère toutes les permissions d'un agent
   */
  async findByAgentId(agentId: string): Promise<AgentPermission[]> {
    return await db.select().from(agentPermissions).where(eq(agentPermissions.agentId, agentId));
  }

  /**
   * Récupère les codes départements d'un agent
   */
  async getDepartementsByAgentId(agentId: string): Promise<string[]> {
    const permissions = await this.findByAgentId(agentId);
    return permissions.map((p) => p.departementCode);
  }

  /**
   * Ajoute une permission département à un agent
   */
  async addDepartement(agentId: string, departementCode: string): Promise<AgentPermission> {
    const [permission] = await db
      .insert(agentPermissions)
      .values({
        agentId,
        departementCode,
      })
      .returning();

    return permission;
  }

  /**
   * Ajoute plusieurs départements à un agent
   */
  async addDepartements(agentId: string, departementCodes: string[]): Promise<AgentPermission[]> {
    if (departementCodes.length === 0) return [];

    const values: NewAgentPermission[] = departementCodes.map((code) => ({
      agentId,
      departementCode: code,
    }));

    return await db.insert(agentPermissions).values(values).returning();
  }

  /**
   * Supprime une permission département d'un agent
   */
  async removeDepartement(agentId: string, departementCode: string): Promise<boolean> {
    const result = await db
      .delete(agentPermissions)
      .where(and(eq(agentPermissions.agentId, agentId), eq(agentPermissions.departementCode, departementCode)))
      .returning();

    return result.length > 0;
  }

  /**
   * Supprime toutes les permissions d'un agent
   */
  async removeAllByAgentId(agentId: string): Promise<number> {
    const result = await db.delete(agentPermissions).where(eq(agentPermissions.agentId, agentId)).returning();

    return result.length;
  }

  /**
   * Remplace toutes les permissions d'un agent par une nouvelle liste
   */
  async replaceDepartements(agentId: string, departementCodes: string[]): Promise<AgentPermission[]> {
    // Supprimer toutes les permissions existantes
    await this.removeAllByAgentId(agentId);

    // Ajouter les nouvelles permissions
    if (departementCodes.length === 0) return [];

    return await this.addDepartements(agentId, departementCodes);
  }

  /**
   * Vérifie si un agent a accès à un département
   */
  async hasAccessToDepartement(agentId: string, departementCode: string): Promise<boolean> {
    const permissions = await db
      .select()
      .from(agentPermissions)
      .where(and(eq(agentPermissions.agentId, agentId), eq(agentPermissions.departementCode, departementCode)))
      .limit(1);

    return permissions.length > 0;
  }

  /**
   * Récupère tous les agents ayant accès à un département
   */
  async findAgentsByDepartement(departementCode: string): Promise<string[]> {
    const permissions = await db
      .select({ agentId: agentPermissions.agentId })
      .from(agentPermissions)
      .where(eq(agentPermissions.departementCode, departementCode));

    return permissions.map((p) => p.agentId);
  }
}

export const agentPermissionsRepository = new AgentPermissionsRepository();
