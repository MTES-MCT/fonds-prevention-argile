import { pgTable, uuid, timestamp, text, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { parcoursPrevention } from "./parcours-prevention";
import { agents } from "./agents";

/**
 * Table des commentaires internes sur les parcours
 * Visible uniquement par les professionnels (agents AMO, Allers-Vers, administrateurs)
 * Permet le suivi et la communication entre professionnels sur un dossier
 */
export const parcoursCommentaires = pgTable("parcours_commentaires", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Relations
  parcoursId: uuid("parcours_id")
    .notNull()
    .references(() => parcoursPrevention.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),

  // Snapshot auteur (dénormalisé, conservé même si l'agent est supprimé)
  authorName: varchar("author_name", { length: 255 }).notNull(),
  authorStructure: varchar("author_structure", { length: 255 }),
  authorStructureType: varchar("author_structure_type", { length: 50 }),

  // Contenu
  message: text("message").notNull(),

  // Timestamps
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  editedAt: timestamp("edited_at", { mode: "date" }), // Date de dernière modification manuelle
});

/**
 * Relations Drizzle
 */
export const parcoursCommentairesRelations = relations(parcoursCommentaires, ({ one }) => ({
  parcours: one(parcoursPrevention, {
    fields: [parcoursCommentaires.parcoursId],
    references: [parcoursPrevention.id],
  }),
  agent: one(agents, {
    fields: [parcoursCommentaires.agentId],
    references: [agents.id],
  }),
}));

// Types TypeScript générés
export type ParcoursCommentaire = typeof parcoursCommentaires.$inferSelect;
export type NewParcoursCommentaire = typeof parcoursCommentaires.$inferInsert;
