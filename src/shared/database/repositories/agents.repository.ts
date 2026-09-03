import { eq, sql, SQL, desc, and, isNull } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { db } from "../client";
import { agents, type Agent, type NewAgent } from "../schema/agents";
import { entreprisesAmo } from "../schema/entreprises-amo";
import { allersVers } from "../schema/allers-vers";
import { parcoursActions } from "../schema/parcours-actions";
import { parcoursPrevention } from "../schema/parcours-prevention";
import { prospectQualifications } from "../schema/prospect-qualifications";
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

/** Exécuteur : le client global, ou une transaction en cours. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AgentsExecutor = typeof db | PgTransaction<any, any, any>;

/**
 * Traces nominatives laissées par un agent : ce qu'une suppression effacerait.
 */
export interface AgentTracesCount {
  actions: number;
  qualifications: number;
  archivages: number;
  dossiersCrees: number;
  simulationsEditees: number;
  total: number;
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
        desactiveAt: agents.desactiveAt,
        desactivePar: agents.desactivePar,
        desactiveRaison: agents.desactiveRaison,
        lastLogin: agents.lastLogin,
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
      desactiveAt: row.desactiveAt,
      desactivePar: row.desactivePar,
      desactiveRaison: row.desactiveRaison,
      lastLogin: row.lastLogin,
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
   * Trouve un agent et sa structure de rattachement (entreprise AMO OU
   * aller-vers). Sert à afficher "Compte créé par X (structure)" côté
   * demandeur quand un dossier a été pré-créé par un agent.
   */
  async findByIdWithStructure(id: string): Promise<{
    id: string;
    givenName: string;
    usualName: string | null;
    role: AgentRole;
    entrepriseAmo: { id: string; nom: string } | null;
    allersVers: { id: string; nom: string } | null;
  } | null> {
    const result = await db
      .select({
        id: agents.id,
        givenName: agents.givenName,
        usualName: agents.usualName,
        role: agents.role,
        amoId: entreprisesAmo.id,
        amoNom: entreprisesAmo.nom,
        avId: allersVers.id,
        avNom: allersVers.nom,
      })
      .from(agents)
      .leftJoin(entreprisesAmo, eq(agents.entrepriseAmoId, entreprisesAmo.id))
      .leftJoin(allersVers, eq(agents.allersVersId, allersVers.id))
      .where(eq(agents.id, id))
      .limit(1);

    const row = result[0];
    if (!row) return null;

    return {
      id: row.id,
      givenName: row.givenName,
      usualName: row.usualName,
      role: row.role as AgentRole,
      entrepriseAmo: row.amoId && row.amoNom ? { id: row.amoId, nom: row.amoNom } : null,
      allersVers: row.avId && row.avNom ? { id: row.avId, nom: row.avNom } : null,
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
        desactiveAt: agents.desactiveAt,
        desactivePar: agents.desactivePar,
        desactiveRaison: agents.desactiveRaison,
        lastLogin: agents.lastLogin,
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
      desactiveAt: row.desactiveAt,
      desactivePar: row.desactivePar,
      desactiveRaison: row.desactiveRaison,
      lastLogin: row.lastLogin,
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
   * Cherche d'abord par sub (connexions suivantes), puis par email pour la première
   * connexion (le sub en base est encore `pending_`) — auquel cas le sub réel est écrit
   * Retourne null si l'agent n'est pas autorisé (pas en base, ou désactivé)
   */
  async authenticateFromProConnect(proConnectData: ProConnectAgentData): Promise<Agent | null> {
    // 1. Vérifier si l'agent existe déjà par sub (connexions suivantes)
    const existingBySub = await this.findBySub(proConnectData.sub);

    // 2. Sinon par email (première connexion, le sub en base est encore pending_)
    const existingByEmail = existingBySub ? null : await this.findByEmail(proConnectData.email);

    // Un agent désactivé est traité comme un agent inconnu : ni connexion, ni mise à jour
    // de ses informations ProConnect (lastLogin compris).
    const existing = existingBySub ?? existingByEmail;
    if (existing?.desactiveAt) {
      console.warn("[AUTH] Connexion ProConnect refusée : agent désactivé", { agentId: existing.id });
      return null;
    }

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
          lastLogin: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agents.sub, proConnectData.sub))
        .returning();

      return updatedAgent;
    }

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
          lastLogin: new Date(),
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
   * Désactive un agent : coupe son accès sans toucher à son historique.
   * No-op (retourne null) si l'agent est déjà désactivé, pour ne pas écraser la date d'origine.
   */
  async desactiver(
    agentId: string,
    desactivePar: string,
    raison?: string | null,
    executor: AgentsExecutor = db
  ): Promise<Agent | null> {
    const [updatedAgent] = await executor
      .update(agents)
      .set({
        desactiveAt: new Date(),
        desactivePar,
        desactiveRaison: raison ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(agents.id, agentId), isNull(agents.desactiveAt)))
      .returning();

    return updatedAgent || null;
  }

  /**
   * Réactive un agent désactivé (rend l'accès ProConnect).
   */
  async reactiver(agentId: string): Promise<Agent | null> {
    const [updatedAgent] = await db
      .update(agents)
      .set({
        desactiveAt: null,
        desactivePar: null,
        desactiveRaison: null,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agentId))
      .returning();

    return updatedAgent || null;
  }

  /**
   * Compte les traces nominatives d'un agent (historique qu'une suppression effacerait).
   * `agent_permissions` en est exclu : c'est de la configuration, pas de l'historique.
   */
  async countTraces(agentId: string): Promise<AgentTracesCount> {
    const total = () => sql<number>`cast(count(*) as integer)`;
    const first = (rows: { count: number }[]) => rows[0]?.count ?? 0;

    const [actions, qualifications, archivages, dossiersCrees, simulationsEditees] = await Promise.all([
      db.select({ count: total() }).from(parcoursActions).where(eq(parcoursActions.agentId, agentId)).then(first),
      db
        .select({ count: total() })
        .from(prospectQualifications)
        .where(eq(prospectQualifications.agentId, agentId))
        .then(first),
      db
        .select({ count: total() })
        .from(parcoursPrevention)
        .where(eq(parcoursPrevention.archivedBy, agentId))
        .then(first),
      db
        .select({ count: total() })
        .from(parcoursPrevention)
        .where(eq(parcoursPrevention.createdByAgentId, agentId))
        .then(first),
      db
        .select({ count: total() })
        .from(parcoursPrevention)
        .where(eq(parcoursPrevention.rgaSimulationAgentEditedBy, agentId))
        .then(first),
    ]);

    return {
      actions,
      qualifications,
      archivages,
      dossiersCrees,
      simulationsEditees,
      total: actions + qualifications + archivages + dossiersCrees + simulationsEditees,
    };
  }

  /**
   * Supprime un agent par son ID (alias de delete)
   */
  async deleteById(agentId: string): Promise<boolean> {
    return this.delete(agentId);
  }
}

export const agentsRepository = new AgentsRepository();
