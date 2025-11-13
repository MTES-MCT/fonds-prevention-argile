import { pgTable, uuid, varchar, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { entreprisesAmo } from "./entreprises-amo";

// Table de liaison entre AMO et EPCI
// Un AMO peut couvrir plusieurs EPCI (Établissements Publics de Coopération Intercommunale)
export const entreprisesAmoEpci = pgTable(
  "entreprises_amo_epci",
  {
    entrepriseAmoId: uuid("entreprise_amo_id")
      .notNull()
      .references(() => entreprisesAmo.id, { onDelete: "cascade" }),
    codeEpci: varchar("code_epci", { length: 9 }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.entrepriseAmoId, table.codeEpci] }),
  })
);

// Relations : une liaison appartient à une entreprise AMO
export const entreprisesAmoEpciRelations = relations(
  entreprisesAmoEpci,
  ({ one }) => ({
    entrepriseAmo: one(entreprisesAmo, {
      fields: [entreprisesAmoEpci.entrepriseAmoId],
      references: [entreprisesAmo.id],
    }),
  })
);

// Types TypeScript générés
export type EntrepriseAmoEpci = typeof entreprisesAmoEpci.$inferSelect;
export type NewEntrepriseAmoEpci = typeof entreprisesAmoEpci.$inferInsert;
