import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { stepEnum, statusEnum } from "../types/parcours.types";
import { dossiersDemarchesSimplifiees } from "./dossiers-demarches-simplifiees";

// Table des parcours de prévention
export const parcoursPrevention = pgTable("parcours_prevention", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique() // Contrainte directement sur la colonne
    .references(() => users.id, { onDelete: "cascade" }),

  currentStep: stepEnum("current_step").notNull().default("ELIGIBILITE"),
  currentStatus: statusEnum("current_status").notNull().default("TODO"),

  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  completedAt: timestamp("completed_at", { mode: "date" }),
});

// Relations : un parcours appartient à un utilisateur et a plusieurs dossiers DS
export const parcoursPreventionRelations = relations(
  parcoursPrevention,
  ({ one, many }) => ({
    user: one(users, {
      fields: [parcoursPrevention.userId],
      references: [users.id],
    }),
    dossiersDemarchesSimplifiees: many(dossiersDemarchesSimplifiees),
  })
);

// Types TypeScript générés
export type ParcoursPrevention = typeof parcoursPrevention.$inferSelect;
export type NewParcoursPrevention = typeof parcoursPrevention.$inferInsert;
