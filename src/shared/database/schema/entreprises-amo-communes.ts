import { pgTable, uuid, varchar, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { entreprisesAmo } from "./entreprises-amo";

// Table de liaison optionnelle entre AMO et communes
// Utilisée uniquement si l'AMO ne couvre pas tout le département
export const entreprisesAmoCommunes = pgTable(
  "entreprises_amo_communes",
  {
    entrepriseAmoId: uuid("entreprise_amo_id")
      .notNull()
      .references(() => entreprisesAmo.id, { onDelete: "cascade" }),
    codeInsee: varchar("code_insee", { length: 5 }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.entrepriseAmoId, table.codeInsee] }),
  })
);

// Relations : une liaison appartient à une entreprise AMO
export const entreprisesAmoCommunesRelations = relations(
  entreprisesAmoCommunes,
  ({ one }) => ({
    entrepriseAmo: one(entreprisesAmo, {
      fields: [entreprisesAmoCommunes.entrepriseAmoId],
      references: [entreprisesAmo.id],
    }),
  })
);

// Types TypeScript générés
export type EntrepriseAmoCommune = typeof entreprisesAmoCommunes.$inferSelect;
export type NewEntrepriseAmoCommune =
  typeof entreprisesAmoCommunes.$inferInsert;
