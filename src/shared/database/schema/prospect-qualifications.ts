import { pgTable, uuid, timestamp, text, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { parcoursPrevention } from "./parcours-prevention";
import { agents } from "./agents";

/**
 * Table des qualifications de prospects par les agents allers-vers
 * Stocke l'historique des décisions de qualification (éligible, non éligible, à qualifier)
 * Un parcours peut avoir plusieurs qualifications (historique)
 */
export const prospectQualifications = pgTable(
  "prospect_qualifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Relations
    parcoursId: uuid("parcours_id")
      .notNull()
      .references(() => parcoursPrevention.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "set null" }),

    // Décision de qualification
    decision: text("decision").notNull(), // "eligible" | "a_qualifier" | "non_eligible"

    // Actions réalisées avec le demandeur
    actionsRealisees: text("actions_realisees").array().notNull(),

    // Raisons d'inéligibilité (rempli uniquement si decision = "non_eligible")
    raisonsIneligibilite: text("raisons_ineligibilite").array(),

    // Note complémentaire (optionnelle)
    note: text("note"),

    // Timestamps
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    parcoursIdIdx: index("prospect_qualifications_parcours_id_idx").on(table.parcoursId),
  }),
);

/**
 * Relations Drizzle
 */
export const prospectQualificationsRelations = relations(prospectQualifications, ({ one }) => ({
  parcours: one(parcoursPrevention, {
    fields: [prospectQualifications.parcoursId],
    references: [parcoursPrevention.id],
  }),
  agent: one(agents, {
    fields: [prospectQualifications.agentId],
    references: [agents.id],
  }),
}));

// Types TypeScript générés
export type ProspectQualification = typeof prospectQualifications.$inferSelect;
export type NewProspectQualification = typeof prospectQualifications.$inferInsert;
