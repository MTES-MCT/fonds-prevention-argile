import { pgTable, varchar, timestamp, uuid, text, type AnyPgColumn } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { agentRolePgEnum } from "../enums/enums";
import { AGENT_ROLES } from "@/shared/domain/value-objects/agent-role.enum";
import type { AgentRole } from "@/shared/domain/value-objects/user-role.enum";
import { entreprisesAmo } from "./entreprises-amo";
import { allersVers } from "./allers-vers";
import { parcoursActions } from "./parcours-actions";
import { structures } from "./structures";

/**
 * Table des agents ProConnect
 * Stocke les utilisateurs connectés via ProConnect (agents publics)
 */
export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Identifiants ProConnect (obligatoires)
  sub: varchar("sub", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),

  // Informations personnelles
  givenName: varchar("given_name", { length: 255 }).notNull(),
  usualName: varchar("usual_name", { length: 255 }),

  // Informations complémentaires ProConnect
  uid: varchar("uid", { length: 255 }),
  siret: varchar("siret", { length: 14 }),
  phone: varchar("phone", { length: 50 }),
  organizationalUnit: varchar("organizational_unit", { length: 255 }),

  // Structure de l'agent : ses rôles en découlent. Null pour un rôle plateforme (admin, analyste).
  structureId: uuid("structure_id").references(() => structures.id, { onDelete: "restrict" }),

  // Colonnes héritées, écrites seulement pour garder le retour arrière possible : ne jamais les lire.
  legacyRole: agentRolePgEnum("role").notNull().default(AGENT_ROLES.ADMINISTRATEUR),
  legacyEntrepriseAmoId: uuid("entreprise_amo_id").references(() => entreprisesAmo.id, {
    onDelete: "set null",
  }),
  legacyAllersVersId: uuid("allers_vers_id").references(() => allersVers.id, {
    onDelete: "set null",
  }),

  // Désactivation : null = agent actif. On désactive au lieu de supprimer pour garder
  // l'historique nominatif (actions, qualifications, archivages) — cf. ADR désactivation agents.
  desactiveAt: timestamp("desactive_at", { mode: "date" }),
  desactivePar: uuid("desactive_par").references((): AnyPgColumn => agents.id, { onDelete: "set null" }),
  desactiveRaison: text("desactive_raison"),

  // Timestamps
  lastLogin: timestamp("last_login", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Relations
export const agentsRelations = relations(agents, ({ one, many }) => ({
  structure: one(structures, {
    fields: [agents.structureId],
    references: [structures.id],
  }),
  actions: many(parcoursActions),
}));

export type AgentLigne = typeof agents.$inferSelect;
export type NewAgentLigne = typeof agents.$inferInsert;

/** Agent tel que l'application le lit : rôle et rattachements dérivés de sa structure (agentsRepository). */
export type Agent = Omit<AgentLigne, "legacyRole" | "legacyEntrepriseAmoId" | "legacyAllersVersId"> & {
  // Null : agent de structure sans habilitation, ou rôle de structure sans structure. Aucun accès.
  role: AgentRole | null;
  entrepriseAmoId: string | null;
  allersVersId: string | null;
};

/** Agent qui a un rôle : le seul que les gardes laissent passer. */
export type AgentAvecRole = Agent & { role: AgentRole };

export function aUnRole(agent: Agent): agent is AgentAvecRole {
  return agent.role !== null;
}
