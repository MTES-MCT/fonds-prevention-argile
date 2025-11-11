import { pgTable, uuid, timestamp, varchar, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { entreprisesAmoCommunes } from "./entreprises-amo-communes";
import { entreprisesAmoEpci } from "./entreprises-amo-epci";

// Table des entreprises AMO (Assistance à Maîtrise d'Ouvrage)
export const entreprisesAmo = pgTable("entreprises_amo", {
  id: uuid("id").primaryKey().defaultRandom(),
  nom: varchar("nom", { length: 255 }).notNull(),
  siret: varchar("siret", { length: 14 }).notNull(),
  departements: text("departements").notNull(), // Format: "Seine-et-Marne 77, Essonne 91"
  emails: text("emails").notNull(), // Format: "email1@test.fr;email2@test.fr"
  telephone: varchar("telephone", { length: 20 }).notNull(),
  adresse: varchar("adresse", { length: 500 }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Relations : une entreprise AMO peut couvrir plusieurs communes et EPCI spécifiques (optionnel)
export const entreprisesAmoRelations = relations(
  entreprisesAmo,
  ({ many }) => ({
    communes: many(entreprisesAmoCommunes),
    epci: many(entreprisesAmoEpci),
  })
);

// Types TypeScript générés
export type EntrepriseAmo = typeof entreprisesAmo.$inferSelect;
export type NewEntrepriseAmo = typeof entreprisesAmo.$inferInsert;
