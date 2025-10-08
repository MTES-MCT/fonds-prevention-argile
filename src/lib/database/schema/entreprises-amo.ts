import { pgTable, uuid, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { entreprisesAmoCommunes } from "./entreprises-amo-communes";

// Table des entreprises AMO (Assistance à Maîtrise d'Ouvrage)
export const entreprisesAmo = pgTable("entreprises_amo", {
  id: uuid("id").primaryKey().defaultRandom(),
  nom: varchar("nom", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  telephone: varchar("telephone", { length: 20 }).notNull(),
  adresse: varchar("adresse", { length: 500 }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Relations : une entreprise AMO couvre plusieurs communes
export const entreprisesAmoRelations = relations(
  entreprisesAmo,
  ({ many }) => ({
    communes: many(entreprisesAmoCommunes),
  })
);

// Types TypeScript générés
export type EntrepriseAmo = typeof entreprisesAmo.$inferSelect;
export type NewEntrepriseAmo = typeof entreprisesAmo.$inferInsert;
