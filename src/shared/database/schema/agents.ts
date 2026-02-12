import { pgTable, varchar, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { agentRolePgEnum } from "../enums/enums";
import { AGENT_ROLES } from "@/shared/domain/value-objects/agent-role.enum";
import { entreprisesAmo } from "./entreprises-amo";
import { allersVers } from "./allers-vers";
import { parcoursCommentaires } from "./parcours-commentaires";

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

  // Rôle de l'agent
  role: agentRolePgEnum("role").notNull().default(AGENT_ROLES.ADMINISTRATEUR),

  // Liaison avec une entreprise AMO (obligatoire si rôle = AMO ou AMO_ET_ALLERS_VERS)
  entrepriseAmoId: uuid("entreprise_amo_id").references(() => entreprisesAmo.id, {
    onDelete: "set null",
  }),

  // Liaison avec une structure Allers-Vers (obligatoire si rôle = ALLERS_VERS ou AMO_ET_ALLERS_VERS)
  allersVersId: uuid("allers_vers_id").references(() => allersVers.id, {
    onDelete: "set null",
  }),

  // Timestamps
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Relations
export const agentsRelations = relations(agents, ({ one, many }) => ({
  entrepriseAmo: one(entreprisesAmo, {
    fields: [agents.entrepriseAmoId],
    references: [entreprisesAmo.id],
  }),
  allersVers: one(allersVers, {
    fields: [agents.allersVersId],
    references: [allersVers.id],
  }),
  commentaires: many(parcoursCommentaires),
}));

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
