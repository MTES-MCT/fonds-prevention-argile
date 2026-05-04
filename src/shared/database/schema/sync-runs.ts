import { pgTable, uuid, timestamp, integer, text, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { syncRunStatusPgEnum, syncRunTriggerPgEnum } from "../enums/enums";
import { SyncRunTrigger } from "@/shared/domain/value-objects/sync-run-status.enum";
import { syncRunEntries } from "./sync-run-entries";

export const syncRuns = pgTable(
  "sync_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    startedAt: timestamp("started_at", { mode: "date" }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { mode: "date" }),

    // success | partial | error — null implicitement tant que !finishedAt
    status: syncRunStatusPgEnum("status"),

    triggeredBy: syncRunTriggerPgEnum("triggered_by").notNull().default(SyncRunTrigger.CRON),

    totalParcoursScanned: integer("total_parcours_scanned").notNull().default(0),
    totalParcoursUpdated: integer("total_parcours_updated").notNull().default(0),
    totalErrors: integer("total_errors").notNull().default(0),

    errorSummary: text("error_summary"),
  },
  (table) => ({
    startedAtIdx: index("sync_runs_started_at_idx").on(table.startedAt),
  })
);

export const syncRunsRelations = relations(syncRuns, ({ many }) => ({
  entries: many(syncRunEntries),
}));

export type SyncRun = typeof syncRuns.$inferSelect;
export type NewSyncRun = typeof syncRuns.$inferInsert;
