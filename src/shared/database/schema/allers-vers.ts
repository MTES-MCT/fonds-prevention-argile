import { pgTable, text, uuid } from "drizzle-orm/pg-core";

/**
 * Table des structures "Allers Vers"
 * Structures publiques ou privées qui font connaître le fonds prévention argile
 */
export const allersVers = pgTable("allers_vers", {
  id: uuid("id").defaultRandom().primaryKey(),
  nom: text("nom").notNull(),
  emails: text("emails").array().notNull(),
  telephone: text("telephone").notNull().default(""),
  adresse: text("adresse").notNull().default(""),
});

export type AllersVers = typeof allersVers.$inferSelect;
export type NewAllersVers = typeof allersVers.$inferInsert;
