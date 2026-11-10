import { date, index, pgTable, primaryKey, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { agents } from "./agents";
import { structures } from "./structures";

// Expert RGA validé par la DHUP : habilitation d'une structure qui ne donne aucun rôle (pas de compte expert).
export const experts = pgTable("experts", {
  id: uuid("id").primaryKey().defaultRandom(),
  nom: varchar("nom", { length: 255 }).notNull(),
  siret: varchar("siret", { length: 14 }).notNull().unique(),
  dateValidationDhup: date("date_validation_dhup"),
  // Contact interne : réservé au super-administrateur, jamais renvoyé à un agent.
  contactInterneNom: varchar("contact_interne_nom", { length: 255 }),
  contactInterneEmail: varchar("contact_interne_email", { length: 255 }),
  contactInterneTelephone: varchar("contact_interne_telephone", { length: 20 }),
  structureId: uuid("structure_id")
    .notNull()
    .unique()
    .references(() => structures.id, { onDelete: "restrict" }),
  desactiveAt: timestamp("desactive_at", { mode: "date" }),
  desactivePar: uuid("desactive_par").references(() => agents.id, { onDelete: "set null" }),
  desactiveRaison: text("desactive_raison"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Un département d'intervention, en code officiel : le contact de réservation (souvent une équipe administrative)
// et l'expert qui se déplace chez le demandeur.
export const expertsDepartements = pgTable(
  "experts_departements",
  {
    expertId: uuid("expert_id")
      .notNull()
      .references(() => experts.id, { onDelete: "cascade" }),
    codeDepartement: text("code_departement").notNull(),
    email: varchar("email", { length: 255 }),
    telephone: varchar("telephone", { length: 20 }),
    expertNom: varchar("expert_nom", { length: 255 }),
    expertEmail: varchar("expert_email", { length: 255 }),
    expertTelephone: varchar("expert_telephone", { length: 20 }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.expertId, table.codeDepartement] }),
    parDepartement: index("experts_departements_code_departement_idx").on(table.codeDepartement),
  })
);

export type Expert = typeof experts.$inferSelect;
export type NewExpert = typeof experts.$inferInsert;
export type ExpertDepartement = typeof expertsDepartements.$inferSelect;
export type NewExpertDepartement = typeof expertsDepartements.$inferInsert;
