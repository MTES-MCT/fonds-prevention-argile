import { eq, sql, SQL, desc } from "drizzle-orm";
import { db } from "../client";
import { agents, type Agent, type NewAgent } from "../schema/agents";
import { BaseRepository } from "./base.repository";
import { AGENT_ROLES } from "@/shared/domain/value-objects/agent-role.enum";
import { AgentRole } from "@/shared/domain/value-objects";

/**
 * Interface pour les données ProConnect lors de l'upsert
 */
export interface ProConnectAgentData {
  sub: string;
  email: string;
  given_name: string;
  usual_name?: string;
  uid?: string;
  siret?: string;
  phone?: string;
  organizational_unit?: string;
}

export class AgentsRepository extends BaseRepository<Agent> {
  /**
   * Trouve un agent par son ID
   */
  async findById(id: string): Promise<Agent | null> {
    const result = await db.select().from(agents).where(eq(agents.id, id));
    return result[0] || null;
  }

  /**
   * Récupère tous les agents
   */
  async findAll(): Promise<Agent[]> {
    return await db.select().from(agents).orderBy(desc(agents.createdAt));
  }

  /**
   * Crée un nouvel agent
   */
  async create(data: NewAgent): Promise<Agent> {
    const result = await db.insert(agents).values(data).returning();
    return result[0];
  }

  /**
   * Met à jour un agent
   */
  async update(id: string, data: Partial<NewAgent>): Promise<Agent | null> {
    const result = await db
      .update(agents)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, id))
      .returning();

    return result[0] || null;
  }

  /**
   * Supprime un agent
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(agents).where(eq(agents.id, id)).returning();

    return result.length > 0;
  }

  /**
   * Vérifie si un agent existe
   */
  async exists(id: string): Promise<boolean> {
    const result = await db.select({ id: agents.id }).from(agents).where(eq(agents.id, id)).limit(1);

    return result.length > 0;
  }

  /**
   * Compte le nombre d'agents
   */
  async count(where?: SQL): Promise<number> {
    const query = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(agents);

    if (where) {
      query.where(where);
    }

    const result = await query;
    return result[0]?.count ?? 0;
  }

  /**
   * Trouve un agent par son sub ProConnect
   */
  async findBySub(sub: string): Promise<Agent | null> {
    const result = await db.select().from(agents).where(eq(agents.sub, sub));
    return result[0] || null;
  }

  /**
   * Trouve un agent par son email
   */
  async findByEmail(email: string): Promise<Agent | null> {
    const result = await db.select().from(agents).where(eq(agents.email, email));
    return result[0] || null;
  }

  /**
   * Crée ou met à jour un agent depuis ProConnect
   * Retourne l'agent (créé ou existant)
   */
  async upsertFromProConnect(
    proConnectData: ProConnectAgentData,
    defaultRole: AgentRole = AGENT_ROLES.ADMINISTRATEUR
  ): Promise<Agent> {
    // 1. Vérifier si l'agent existe déjà par sub
    const existingBySub = await this.findBySub(proConnectData.sub);

    if (existingBySub) {
      // Mettre à jour les informations de l'agent existant
      const [updatedAgent] = await db
        .update(agents)
        .set({
          email: proConnectData.email,
          givenName: proConnectData.given_name,
          usualName: proConnectData.usual_name,
          uid: proConnectData.uid,
          siret: proConnectData.siret,
          phone: proConnectData.phone,
          organizationalUnit: proConnectData.organizational_unit,
          updatedAt: new Date(),
        })
        .where(eq(agents.sub, proConnectData.sub))
        .returning();

      return updatedAgent;
    }

    // 2. Vérifier si l'agent existe par email (cas d'un agent pré-créé avec sub pending_)
    const existingByEmail = await this.findByEmail(proConnectData.email);

    if (existingByEmail) {
      // Mettre à jour le sub et les autres informations
      const [updatedAgent] = await db
        .update(agents)
        .set({
          sub: proConnectData.sub, // Mise à jour du sub !
          givenName: proConnectData.given_name,
          usualName: proConnectData.usual_name,
          uid: proConnectData.uid,
          siret: proConnectData.siret,
          phone: proConnectData.phone,
          organizationalUnit: proConnectData.organizational_unit,
          updatedAt: new Date(),
        })
        .where(eq(agents.email, proConnectData.email))
        .returning();

      return updatedAgent;
    }

    // 3. Créer un nouvel agent (email non trouvé = agent non autorisé)
    // TODO : Vérifier si la création est autorisée dans ce contexte
    const [newAgent] = await db
      .insert(agents)
      .values({
        sub: proConnectData.sub,
        email: proConnectData.email,
        givenName: proConnectData.given_name,
        usualName: proConnectData.usual_name,
        uid: proConnectData.uid,
        siret: proConnectData.siret,
        phone: proConnectData.phone,
        organizationalUnit: proConnectData.organizational_unit,
        role: defaultRole,
      })
      .returning();

    return newAgent;
  }

  /**
   * Met à jour le rôle d'un agent
   */
  async updateRole(agentId: string, role: AgentRole): Promise<Agent | null> {
    const [updatedAgent] = await db
      .update(agents)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agentId))
      .returning();

    return updatedAgent || null;
  }

  /**
   * Supprime un agent par son ID (alias de delete)
   */
  async deleteById(agentId: string): Promise<boolean> {
    return this.delete(agentId);
  }
}

export const agentsRepository = new AgentsRepository();
