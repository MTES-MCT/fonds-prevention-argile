import { pgTable, uuid, timestamp, boolean, text, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { syncRuns } from "./sync-runs";
import { parcoursPrevention } from "./parcours-prevention";
import { stepPgEnum, statusPgEnum } from "../enums/enums";
import type { Step } from "@/shared/domain/value-objects/step.enum";
import type { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";

/**
 * Détail des changements DS détectés pendant la synchro d'un parcours.
 */
export interface DsStatusChange {
  step: Step;
  oldDsStatus: DSStatus;
  newDsStatus: DSStatus;
}

export const syncRunEntries = pgTable(
  "sync_run_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    syncRunId: uuid("sync_run_id")
      .notNull()
      .references(() => syncRuns.id, { onDelete: "cascade" }),

    parcoursId: uuid("parcours_id")
      .notNull()
      .references(() => parcoursPrevention.id, { onDelete: "cascade" }),

    stepBefore: stepPgEnum("step_before"),
    stepAfter: stepPgEnum("step_after"),

    statusBefore: statusPgEnum("status_before"),
    statusAfter: statusPgEnum("status_after"),

    dsStatusChanges: jsonb("ds_status_changes").$type<DsStatusChange[]>(),

    stepAdvanced: boolean("step_advanced").notNull().default(false),

    error: text("error"),

    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    syncRunIdIdx: index("sync_run_entries_sync_run_id_idx").on(table.syncRunId),
    parcoursIdIdx: index("sync_run_entries_parcours_id_idx").on(table.parcoursId),
  })
);

export const syncRunEntriesRelations = relations(syncRunEntries, ({ one }) => ({
  syncRun: one(syncRuns, {
    fields: [syncRunEntries.syncRunId],
    references: [syncRuns.id],
  }),
  parcours: one(parcoursPrevention, {
    fields: [syncRunEntries.parcoursId],
    references: [parcoursPrevention.id],
  }),
}));

export type SyncRunEntry = typeof syncRunEntries.$inferSelect;
export type NewSyncRunEntry = typeof syncRunEntries.$inferInsert;
