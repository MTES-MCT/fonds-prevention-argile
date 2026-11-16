import { boolean, index, pgTable, smallint, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { parcoursPrevention } from "./parcours-prevention";

// Un avis par parcours et par étape ; un avis sur le simulateur est anonyme (parcours_id nul).
export const avis = pgTable(
  "avis",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sujet: varchar("sujet", { length: 32 }).notNull(),
    note: smallint("note").notNull(),
    commentaire: text("commentaire"),
    origine: varchar("origine", { length: 16 }).notNull(),
    parcoursId: uuid("parcours_id").references(() => parcoursPrevention.id, { onDelete: "cascade" }),

    // Contexte d'un avis anonyme sur le simulateur, sans rien d'identifiant.
    simulationEligible: boolean("simulation_eligible"),
    codeDepartement: varchar("code_departement", { length: 3 }),

    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    // Postgres tient deux NULL pour distincts : l'unicité ne porte que sur les avis rattachés.
    parcoursSujetIdx: uniqueIndex("avis_parcours_sujet_idx").on(table.parcoursId, table.sujet),
    sujetIdx: index("avis_sujet_idx").on(table.sujet),
    createdAtIdx: index("avis_created_at_idx").on(table.createdAt),
  })
);

export type Avis = typeof avis.$inferSelect;
export type NewAvis = typeof avis.$inferInsert;
