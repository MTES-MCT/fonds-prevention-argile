import { pgTable, uuid, timestamp, text, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { parcoursPrevention } from "./parcours-prevention";
import { agents } from "./agents";

/**
 * Table des actions réalisées par les professionnels sur les parcours
 * Visible uniquement par les professionnels (agents AMO, Allers-Vers, administrateurs)
 * Une action = un type d'action typé + un commentaire optionnel.
 * Le type "commentaire_libre" correspond aux anciennes notes partagées (texte libre).
 */
export const parcoursActions = pgTable("parcours_actions", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Relations
  parcoursId: uuid("parcours_id")
    .notNull()
    .references(() => parcoursPrevention.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),

  // Type d'action (cf. ACTION_TYPE_GROUPS) — "commentaire_libre" par défaut pour l'historique
  actionType: text("action_type").notNull(),
  // Précision libre lorsque actionType = "autre"
  actionPrecision: text("action_precision"),

  // Snapshot auteur (dénormalisé, conservé même si l'agent est supprimé)
  authorName: varchar("author_name", { length: 255 }).notNull(),
  authorStructure: varchar("author_structure", { length: 255 }),
  authorStructureType: varchar("author_structure_type", { length: 50 }),

  // Commentaire optionnel lié à l'action (le demandeur n'y a pas accès)
  message: text("message"),

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
export const parcoursActionsRelations = relations(parcoursActions, ({ one }) => ({
  parcours: one(parcoursPrevention, {
    fields: [parcoursActions.parcoursId],
    references: [parcoursPrevention.id],
  }),
  agent: one(agents, {
    fields: [parcoursActions.agentId],
    references: [agents.id],
  }),
}));

// Types TypeScript générés
export type ParcoursAction = typeof parcoursActions.$inferSelect;
export type NewParcoursAction = typeof parcoursActions.$inferInsert;
