import { pgTable, uuid, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { parcoursPrevention } from "./parcours-prevention";
import { stepEnum, dsStatusEnum } from "../types/parcours.types";

// Table des dossiers Démarches Simplifiées
export const dossiersDemarchesSimplifiees = pgTable(
  "dossiers_demarches_simplifiees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parcoursId: uuid("parcours_id")
      .notNull()
      .references(() => parcoursPrevention.id, { onDelete: "cascade" }),

    step: stepEnum("step").notNull(),

    // Références DS uniquement
    dsNumber: varchar("ds_number", { length: 50 }).unique(), // Unique directement
    dsId: varchar("ds_id", { length: 50 }),
    dsDemarcheId: varchar("ds_demarche_id", { length: 50 }).notNull(),

    dsStatus: dsStatusEnum("ds_status").notNull().default("en_construction"),

    submittedAt: timestamp("submitted_at", { mode: "date" }),
    processedAt: timestamp("processed_at", { mode: "date" }),

    dsUrl: varchar("ds_url", { length: 500 }),

    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    lastSyncAt: timestamp("last_sync_at", { mode: "date" }),
  }
);

// Relations : un dossier appartient à un parcours
export const dossiersDemarchesSimplifieeesRelations = relations(
  dossiersDemarchesSimplifiees,
  ({ one }) => ({
    parcours: one(parcoursPrevention, {
      fields: [dossiersDemarchesSimplifiees.parcoursId],
      references: [parcoursPrevention.id],
    }),
  })
);

// Types TypeScript générés
export type DossierDemarchesSimplifiees =
  typeof dossiersDemarchesSimplifiees.$inferSelect;
export type NewDossierDemarchesSimplifiees =
  typeof dossiersDemarchesSimplifiees.$inferInsert;
