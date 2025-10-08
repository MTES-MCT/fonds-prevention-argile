import { pgTable, uuid, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { entreprisesAmo } from "./entreprises-amo";

// Table de liaison entre entreprises AMO et codes INSEE
export const entreprisesAmoCommunes = pgTable(
  "entreprises_amo_communes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entrepriseAmoId: uuid("entreprise_amo_id")
      .notNull()
      .references(() => entreprisesAmo.id, { onDelete: "cascade" }),
    codeInsee: varchar("code_insee", { length: 5 }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    // Index pour optimiser les recherches par code INSEE
    codeInseeIdx: index("code_insee_idx").on(table.codeInsee),
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
