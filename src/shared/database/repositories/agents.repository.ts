import { eq, sql, SQL, desc, and, isNull } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { db } from "../client";
import { agents, aUnRole, type Agent, type AgentAvecRole, type AgentLigne } from "../schema/agents";
import { entreprisesAmo } from "../schema/entreprises-amo";
import { allersVers } from "../schema/allers-vers";
import { structures } from "../schema/structures";
import { parcoursActions } from "../schema/parcours-actions";
import { parcoursPrevention } from "../schema/parcours-prevention";
import { prospectQualifications } from "../schema/prospect-qualifications";
import { BaseRepository } from "./base.repository";
import { structuresRepository } from "./structures.repository";
import {
  resoudreRoleAgent,
  roleDepuisStructure,
  type AgentRole,
  type CompteAgent,
} from "@/shared/domain/value-objects";

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

/** Agent et les lignes de sa structure, pour l'affichage. */
export interface AgentAvecStructure extends Agent {
  structure: { id: string; nom: string } | null;
  entrepriseAmo: { id: string; nom: string; siret: string } | null;
  allersVers: { id: string; nom: string } | null;
}

/** Agent à créer : son rôle vient de son compte, plateforme ou structure. */
export interface NouvelAgent {
  sub: string;
  email: string;
  givenName: string;
  usualName?: string | null;
  compte: CompteAgent;
}

export interface ModificationAgent {
  email?: string;
  givenName?: string;
  usualName?: string | null;
  compte?: CompteAgent;
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

/** Colonnes lues pour tout agent : sa ligne, et les habilitations de sa structure. */
const colonnesResolues = {
  agent: agents,
  structureNom: structures.nom,
  amoId: entreprisesAmo.id,
  amoNom: entreprisesAmo.nom,
  amoSiret: entreprisesAmo.siret,
  avId: allersVers.id,
  avNom: allersVers.nom,
};

interface LigneResolue {
  agent: AgentLigne;
  structureNom: string | null;
  amoId: string | null;
  amoNom: string | null;
  amoSiret: string | null;
  avId: string | null;
  avNom: string | null;
}

function selectResolu(executor: AgentsExecutor = db) {
  return executor
    .select(colonnesResolues)
    .from(agents)
    .leftJoin(structures, eq(structures.id, agents.structureId))
    .leftJoin(entreprisesAmo, eq(entreprisesAmo.structureId, agents.structureId))
    .leftJoin(allersVers, eq(allersVers.structureId, agents.structureId));
}

function versAgent({ agent, amoId, avId }: LigneResolue): Agent {
  return {
    id: agent.id,
    sub: agent.sub,
    email: agent.email,
    givenName: agent.givenName,
    usualName: agent.usualName,
    uid: agent.uid,
    siret: agent.siret,
    phone: agent.phone,
    organizationalUnit: agent.organizationalUnit,
    structureId: agent.structureId,
    role: resoudreRoleAgent({
      structureId: agent.structureId,
      roleStocke: agent.legacyRole,
      habilitations: { amo: amoId !== null, allersVers: avId !== null },
    }),
    entrepriseAmoId: amoId,
    allersVersId: avId,
    desactiveAt: agent.desactiveAt,
    desactivePar: agent.desactivePar,
    desactiveRaison: agent.desactiveRaison,
    lastLogin: agent.lastLogin,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
}

function versAgentAvecStructure(ligne: LigneResolue): AgentAvecStructure {
  const { agent, structureNom, amoId, amoNom, amoSiret, avId, avNom } = ligne;
  return {
    ...versAgent(ligne),
    structure: agent.structureId && structureNom ? { id: agent.structureId, nom: structureNom } : null,
    entrepriseAmo: amoId && amoNom && amoSiret ? { id: amoId, nom: amoNom, siret: amoSiret } : null,
    allersVers: avId && avNom ? { id: avId, nom: avNom } : null,
  };
}

/** Colonnes héritées d'un rattachement : écrites pour qu'un retour arrière retrouve des rôles justes. */
interface ColonnesRattachement {
  structureId: string | null;
  legacyRole: AgentRole;
  legacyEntrepriseAmoId: string | null;
  legacyAllersVersId: string | null;
}

export class AgentsRepository extends BaseRepository<Agent> {
  async findById(id: string, executor: AgentsExecutor = db): Promise<Agent | null> {
    const [ligne] = await selectResolu(executor).where(eq(agents.id, id)).limit(1);
    return ligne ? versAgent(ligne) : null;
  }

  async findByIdAvecStructure(id: string): Promise<AgentAvecStructure | null> {
    const [ligne] = await selectResolu().where(eq(agents.id, id)).limit(1);
    return ligne ? versAgentAvecStructure(ligne) : null;
  }

  async findAll(): Promise<Agent[]> {
    const lignes = await selectResolu().orderBy(desc(agents.createdAt));
    return lignes.map(versAgent);
  }

  async findAllAvecStructure(): Promise<AgentAvecStructure[]> {
    const lignes = await selectResolu().orderBy(desc(agents.createdAt));
    return lignes.map(versAgentAvecStructure);
  }

  async findBySub(sub: string): Promise<Agent | null> {
    const [ligne] = await selectResolu().where(eq(agents.sub, sub)).limit(1);
    return ligne ? versAgent(ligne) : null;
  }

  async findByEmail(email: string): Promise<Agent | null> {
    const [ligne] = await selectResolu().where(eq(agents.email, email)).limit(1);
    return ligne ? versAgent(ligne) : null;
  }

  /** Lève si la structure n'existe pas ou n'a aucun rôle à transmettre. */
  async create(nouvel: NouvelAgent): Promise<Agent> {
    const rattachement = await this.colonnesRattachement(nouvel.compte);
    const [cree] = await db
      .insert(agents)
      .values({
        sub: nouvel.sub,
        email: nouvel.email,
        givenName: nouvel.givenName,
        usualName: nouvel.usualName ?? null,
        ...rattachement,
      })
      .returning({ id: agents.id });

    return (await this.findById(cree.id))!;
  }

  async update(id: string, modification: ModificationAgent): Promise<Agent | null> {
    const rattachement = modification.compte ? await this.colonnesRattachement(modification.compte) : {};
    const [modifie] = await db
      .update(agents)
      .set({
        ...(modification.email !== undefined && { email: modification.email }),
        ...(modification.givenName !== undefined && { givenName: modification.givenName }),
        ...(modification.usualName !== undefined && { usualName: modification.usualName }),
        ...rattachement,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, id))
      .returning({ id: agents.id });

    return modifie ? this.findById(modifie.id) : null;
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
   * Authentifie un agent depuis ProConnect
   * Cherche d'abord par sub (connexions suivantes), puis par email pour la première
   * connexion (le sub en base est encore `pending_`) — auquel cas le sub réel est écrit
   * Retourne null si l'agent n'est pas autorisé (pas en base, désactivé, ou sans rôle)
   */
  async authenticateFromProConnect(proConnectData: ProConnectAgentData): Promise<AgentAvecRole | null> {
    const existingBySub = await this.findBySub(proConnectData.sub);
    const existingByEmail = existingBySub ? null : await this.findByEmail(proConnectData.email);

    // Refusé sans aucune écriture (lastLogin compris), comme un agent inconnu.
    const existing = existingBySub ?? existingByEmail;
    if (existing?.desactiveAt) {
      console.warn("[AUTH] Connexion ProConnect refusée : agent désactivé", { agentId: existing.id });
      return null;
    }
    if (existing && !existing.role) {
      console.warn("[AUTH] Connexion ProConnect refusée : agent sans rôle", { agentId: existing.id });
      return null;
    }

    const informations = {
      givenName: proConnectData.given_name,
      usualName: proConnectData.usual_name,
      uid: proConnectData.uid,
      siret: proConnectData.siret,
      phone: proConnectData.phone,
      organizationalUnit: proConnectData.organizational_unit,
      lastLogin: new Date(),
      updatedAt: new Date(),
    };

    if (existingBySub) {
      await db
        .update(agents)
        .set({ ...informations, email: proConnectData.email })
        .where(eq(agents.sub, proConnectData.sub));
      return this.relireAvecRole(existingBySub.id);
    }

    if (existingByEmail) {
      // Première connexion : le sub pending_ devient le vrai sub
      await db
        .update(agents)
        .set({ ...informations, sub: proConnectData.sub })
        .where(eq(agents.email, proConnectData.email));
      return this.relireAvecRole(existingByEmail.id);
    }

    return null;
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
    const [desactive] = await executor
      .update(agents)
      .set({
        desactiveAt: new Date(),
        desactivePar,
        desactiveRaison: raison ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(agents.id, agentId), isNull(agents.desactiveAt)))
      .returning({ id: agents.id });

    return desactive ? this.findById(desactive.id, executor) : null;
  }

  /**
   * Réactive un agent désactivé (rend l'accès ProConnect).
   */
  async reactiver(agentId: string): Promise<Agent | null> {
    const [reactive] = await db
      .update(agents)
      .set({
        desactiveAt: null,
        desactivePar: null,
        desactiveRaison: null,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agentId))
      .returning({ id: agents.id });

    return reactive ? this.findById(reactive.id) : null;
  }

  /** Agents rattachés à une structure, désactivés compris. */
  async compterParStructure(structureId: string): Promise<number> {
    return this.count(eq(agents.structureId, structureId));
  }

  /** Réaligne les colonnes héritées des agents d'une structure dont une habilitation a changé. */
  async resynchroniserColonnesHeritees(structureId: string, executor: AgentsExecutor = db): Promise<void> {
    const structure = await structuresRepository.findAvecHabilitations(structureId, executor);
    if (!structure) return;
    const role = roleDepuisStructure({ amo: !!structure.entrepriseAmo, allersVers: !!structure.allersVers });
    // Sans rôle restant, l'ancien code doit garder de quoi refuser : on ne touche à rien.
    if (!role) return;

    await executor
      .update(agents)
      .set({
        legacyRole: role,
        legacyEntrepriseAmoId: structure.entrepriseAmo?.id ?? null,
        legacyAllersVersId: structure.allersVers?.id ?? null,
      })
      .where(eq(agents.structureId, structureId));
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

  private async relireAvecRole(id: string): Promise<AgentAvecRole | null> {
    const agent = await this.findById(id);
    return agent && aUnRole(agent) ? agent : null;
  }

  private async colonnesRattachement(compte: CompteAgent): Promise<ColonnesRattachement> {
    if (compte.type === "plateforme") {
      return { structureId: null, legacyRole: compte.role, legacyEntrepriseAmoId: null, legacyAllersVersId: null };
    }

    const structure = await structuresRepository.findAvecHabilitations(compte.structureId);
    const role = structure
      ? roleDepuisStructure({ amo: !!structure.entrepriseAmo, allersVers: !!structure.allersVers })
      : null;
    if (!structure || !role) {
      throw new Error("La structure sélectionnée n'existe pas ou n'a aucun rôle à transmettre");
    }

    return {
      structureId: structure.id,
      legacyRole: role,
      legacyEntrepriseAmoId: structure.entrepriseAmo?.id ?? null,
      legacyAllersVersId: structure.allersVers?.id ?? null,
    };
  }
}

export const agentsRepository = new AgentsRepository();
