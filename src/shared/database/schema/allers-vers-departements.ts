import { pgTable, text, uuid, primaryKey } from "drizzle-orm/pg-core";
import { allersVers } from "./allers-vers";

/**
 * Table de liaison entre Allers Vers et Départements
 * Relation many-to-many
 */
export const allersVersDepartements = pgTable(
  "allers_vers_departements",
  {
    allersVersId: uuid("allers_vers_id")
      .notNull()
      .references(() => allersVers.id, { onDelete: "cascade" }),
    codeDepartement: text("code_departement").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.allersVersId, table.codeDepartement] }),
  })
);

export type AllersVersDepartement = typeof allersVersDepartements.$inferSelect;
export type NewAllersVersDepartement = typeof allersVersDepartements.$inferInsert;
