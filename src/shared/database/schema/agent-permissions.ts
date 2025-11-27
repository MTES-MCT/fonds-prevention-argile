import { pgTable, varchar, timestamp, uuid } from "drizzle-orm/pg-core";
import { agents } from "./agents";

/**
 * Table des permissions géographiques des agents
 *
 * TODO: Cette structure est temporaire et va évoluer
 * - Actuellement : restriction par département(s)
 * - À venir : région, national, combinaisons, etc.
 *
 * Un agent peut avoir plusieurs entrées (= accès à plusieurs départements)
 * Un super_administrateur n'a pas besoin d'entrées (accès national)
 */
export const agentPermissions = pgTable("agent_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Référence à l'agent
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),

  // Code département (ex: "75", "92", "971")
  // TODO: Évoluera vers un système plus flexible (région, national)
  departementCode: varchar("departement_code", { length: 3 }).notNull(),

  // Timestamps
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export type AgentPermission = typeof agentPermissions.$inferSelect;
export type NewAgentPermission = typeof agentPermissions.$inferInsert;
