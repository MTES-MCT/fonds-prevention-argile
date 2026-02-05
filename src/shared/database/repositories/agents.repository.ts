import { eq, sql, SQL, desc } from "drizzle-orm";
import { db } from "../client";
import { agents, type Agent, type NewAgent } from "../schema/agents";
import { entreprisesAmo } from "../schema/entreprises-amo";
import { BaseRepository } from "./base.repository";
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

/**
 * Agent avec les informations de son entreprise AMO
 */
export interface AgentWithEntrepriseAmo extends Agent {
  entrepriseAmo: {
    id: string;
    nom: string;
    siret: string;
  } | null;
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
   * Trouve un agent par son ID avec son entreprise AMO
   */
  async findByIdWithEntrepriseAmo(id: string): Promise<AgentWithEntrepriseAmo | null> {
    const result = await db
      .select({
        id: agents.id,
        sub: agents.sub,
        email: agents.email,
        givenName: agents.givenName,
        usualName: agents.usualName,
        uid: agents.uid,
        siret: agents.siret,
        phone: agents.phone,
        organizationalUnit: agents.organizationalUnit,
        role: agents.role,
        entrepriseAmoId: agents.entrepriseAmoId,
        allersVersId: agents.allersVersId,
        createdAt: agents.createdAt,
        updatedAt: agents.updatedAt,
        entrepriseAmoDbId: entreprisesAmo.id,
        entrepriseAmoNom: entreprisesAmo.nom,
        entrepriseAmoSiret: entreprisesAmo.siret,
      })
      .from(agents)
      .leftJoin(entreprisesAmo, eq(agents.entrepriseAmoId, entreprisesAmo.id))
      .where(eq(agents.id, id));

    if (!result[0]) return null;

    const row = result[0];
    return {
      id: row.id,
      sub: row.sub,
      email: row.email,
      givenName: row.givenName,
      usualName: row.usualName,
      uid: row.uid,
      siret: row.siret,
      phone: row.phone,
      organizationalUnit: row.organizationalUnit,
      role: row.role,
      entrepriseAmoId: row.entrepriseAmoId,
      allersVersId: row.allersVersId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      entrepriseAmo:
        row.entrepriseAmoDbId && row.entrepriseAmoNom && row.entrepriseAmoSiret
          ? {
              id: row.entrepriseAmoDbId,
              nom: row.entrepriseAmoNom,
              siret: row.entrepriseAmoSiret,
            }
          : null,
    };
  }

  /**
   * Récupère tous les agents
   */
  async findAll(): Promise<Agent[]> {
    return await db.select().from(agents).orderBy(desc(agents.createdAt));
  }

  /**
   * Récupère tous les agents avec leur entreprise AMO
   */
  async findAllWithEntrepriseAmo(): Promise<AgentWithEntrepriseAmo[]> {
    const result = await db
      .select({
        id: agents.id,
        sub: agents.sub,
        email: agents.email,
        givenName: agents.givenName,
        usualName: agents.usualName,
        uid: agents.uid,
        siret: agents.siret,
        phone: agents.phone,
        organizationalUnit: agents.organizationalUnit,
        role: agents.role,
        entrepriseAmoId: agents.entrepriseAmoId,
        allersVersId: agents.allersVersId,
        createdAt: agents.createdAt,
        updatedAt: agents.updatedAt,
        entrepriseAmoDbId: entreprisesAmo.id,
        entrepriseAmoNom: entreprisesAmo.nom,
        entrepriseAmoSiret: entreprisesAmo.siret,
      })
      .from(agents)
      .leftJoin(entreprisesAmo, eq(agents.entrepriseAmoId, entreprisesAmo.id))
      .orderBy(desc(agents.createdAt));

    return result.map((row) => ({
      id: row.id,
      sub: row.sub,
      email: row.email,
      givenName: row.givenName,
      usualName: row.usualName,
      uid: row.uid,
      siret: row.siret,
      phone: row.phone,
      organizationalUnit: row.organizationalUnit,
      role: row.role,
      entrepriseAmoId: row.entrepriseAmoId,
      allersVersId: row.allersVersId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      entrepriseAmo:
        row.entrepriseAmoDbId && row.entrepriseAmoNom && row.entrepriseAmoSiret
          ? {
              id: row.entrepriseAmoDbId,
              nom: row.entrepriseAmoNom,
              siret: row.entrepriseAmoSiret,
            }
          : null,
    }));
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
   * Authentifie un agent depuis ProConnect
   * Cherche d'abord par email (pour la première connexion avec sub pending_)
   * puis met à jour le sub réel lors de la première connexion
   * Retourne null si l'agent n'est pas autorisé (pas en base)
   */
  async authenticateFromProConnect(proConnectData: ProConnectAgentData): Promise<Agent | null> {
    // 1. Vérifier si l'agent existe déjà par sub (connexions suivantes)
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

    // 2. Vérifier si l'agent existe par email (première connexion avec sub pending_)
    const existingByEmail = await this.findByEmail(proConnectData.email);

    if (existingByEmail) {
      // Mettre à jour le sub réel et les autres informations
      const [updatedAgent] = await db
        .update(agents)
        .set({
          sub: proConnectData.sub, // Mise à jour du sub depuis pending_ vers le vrai sub
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

    // 3. Agent non trouvé = non autorisé
    return null;
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
   * Met à jour l'entreprise AMO d'un agent
   */
  async updateEntrepriseAmo(agentId: string, entrepriseAmoId: string | null): Promise<Agent | null> {
    const [updatedAgent] = await db
      .update(agents)
      .set({
        entrepriseAmoId,
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
