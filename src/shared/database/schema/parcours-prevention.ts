import { pgTable, uuid, timestamp, jsonb, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { dossiersDemarchesSimplifiees } from "./dossiers-demarches-simplifiees";
import { statusPgEnum, stepPgEnum } from "../enums/enums";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";

export const parcoursPrevention = pgTable("parcours_prevention", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),

  currentStep: stepPgEnum("current_step").notNull().default(Step.CHOIX_AMO),
  currentStatus: statusPgEnum("current_status").notNull().default(Status.TODO),

  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  completedAt: timestamp("completed_at", { mode: "date" }),

  rgaSimulationData: jsonb("rga_simulation_data").$type<RGASimulationData>(),
  rgaSimulationCompletedAt: timestamp("rga_simulation_completed_at", {
    mode: "date",
  }),
  rgaDataDeletedAt: timestamp("rga_data_deleted_at", { mode: "date" }),
  rgaDataDeletionReason: text("rga_data_deletion_reason"),
});

export const parcoursPreventionRelations = relations(parcoursPrevention, ({ one, many }) => ({
  user: one(users, {
    fields: [parcoursPrevention.userId],
    references: [users.id],
  }),
  dossiersDemarchesSimplifiees: many(dossiersDemarchesSimplifiees),
}));

export type ParcoursPrevention = typeof parcoursPrevention.$inferSelect;
export type NewParcoursPrevention = typeof parcoursPrevention.$inferInsert;
