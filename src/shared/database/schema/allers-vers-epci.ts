import { pgTable, text, uuid, primaryKey } from "drizzle-orm/pg-core";
import { allersVers } from "./allers-vers";

/**
 * Table de liaison entre Allers Vers et EPCI
 * Relation many-to-many
 */
export const allersVersEpci = pgTable(
  "allers_vers_epci",
  {
    allersVersId: uuid("allers_vers_id")
      .notNull()
      .references(() => allersVers.id, { onDelete: "cascade" }),
    codeEpci: text("code_epci").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.allersVersId, table.codeEpci] }),
  })
);

export type AllersVersEpci = typeof allersVersEpci.$inferSelect;
export type NewAllersVersEpci = typeof allersVersEpci.$inferInsert;
