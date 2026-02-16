import { pgTable, uuid, timestamp, jsonb, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { agents } from "./agents";
import { dossiersDemarchesSimplifiees } from "./dossiers-demarches-simplifiees";
import { parcoursCommentaires } from "./parcours-commentaires";
import { statusPgEnum, stepPgEnum, situationParticulierPgEnum } from "../enums/enums";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";

export const parcoursPrevention = pgTable("parcours_prevention", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),

  currentStep: stepPgEnum("current_step").notNull().default(Step.CHOIX_AMO),
  currentStatus: statusPgEnum("current_status").notNull().default(Status.TODO),

  // État métier global du particulier
  situationParticulier: situationParticulierPgEnum("situation_particulier")
    .notNull()
    .default(SituationParticulier.PROSPECT),

  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  completedAt: timestamp("completed_at", { mode: "date" }),

  // Données de simulation initiales (saisies par le particulier dans le simulateur)
  rgaSimulationData: jsonb("rga_simulation_data").$type<RGASimulationData>(),
  rgaSimulationCompletedAt: timestamp("rga_simulation_completed_at", {
    mode: "date",
  }),
  rgaDataDeletedAt: timestamp("rga_data_deleted_at", { mode: "date" }),
  rgaDataDeletionReason: text("rga_data_deletion_reason"),

  // Données de simulation éditées par l'AMO (prioritaires sur les données initiales)
  rgaSimulationDataAmo: jsonb("rga_simulation_data_amo").$type<RGASimulationData>(),
  rgaSimulationAmoEditedAt: timestamp("rga_simulation_amo_edited_at", {
    mode: "date",
  }),
  rgaSimulationAmoEditedBy: uuid("rga_simulation_amo_edited_by").references(
    () => agents.id,
    { onDelete: "set null" },
  ),

  // Archivage
  archivedAt: timestamp("archived_at", { mode: "date" }),
  archiveReason: text("archive_reason"),
});

export const parcoursPreventionRelations = relations(parcoursPrevention, ({ one, many }) => ({
  user: one(users, {
    fields: [parcoursPrevention.userId],
    references: [users.id],
  }),
  amoEditor: one(agents, {
    fields: [parcoursPrevention.rgaSimulationAmoEditedBy],
    references: [agents.id],
  }),
  dossiersDemarchesSimplifiees: many(dossiersDemarchesSimplifiees),
  commentaires: many(parcoursCommentaires),
}));

export type ParcoursPrevention = typeof parcoursPrevention.$inferSelect;
export type NewParcoursPrevention = typeof parcoursPrevention.$inferInsert;
