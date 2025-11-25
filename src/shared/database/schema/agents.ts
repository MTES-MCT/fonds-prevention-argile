import { pgTable, varchar, timestamp, uuid } from "drizzle-orm/pg-core";
import { agentRolePgEnum } from "../enums/enums";
import { AGENT_ROLES } from "@/shared/domain/value-objects/agent-role.enum";

/**
 * Table des agents ProConnect
 * Stocke les utilisateurs connectés via ProConnect (agents publics)
 */
export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Identifiants ProConnect (obligatoires)
  sub: varchar("sub", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),

  // Informations personnelles (obligatoires ProConnect)
  givenName: varchar("given_name", { length: 255 }).notNull(),
  usualName: varchar("usual_name", { length: 255 }).notNull(),

  // Informations complémentaires ProConnect
  uid: varchar("uid", { length: 255 }),
  siret: varchar("siret", { length: 14 }),
  phone: varchar("phone", { length: 50 }),
  organizationalUnit: varchar("organizational_unit", { length: 255 }),

  // Rôle de l'agent
  role: agentRolePgEnum("role").notNull().default(AGENT_ROLES.INSTRUCTEUR),

  // Timestamps
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
