import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { structures } from "./structures";

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
  // Horaires d'ouverture en texte libre (1-2 lignes), ex: "Du mardi au vendredi 8h30 - 12h / 13h - 17h30"
  horaires: text("horaires"),
  // Habilitation Aller-vers d'une structure : une structure n'en porte qu'une.
  structureId: uuid("structure_id")
    .notNull()
    .unique()
    .references(() => structures.id, { onDelete: "restrict" }),
});

export type AllersVers = typeof allersVers.$inferSelect;
export type NewAllersVers = typeof allersVers.$inferInsert;
