CREATE TYPE "public"."sync_run_status" AS ENUM('success', 'partial', 'error');--> statement-breakpoint
CREATE TYPE "public"."sync_run_trigger" AS ENUM('cron', 'manual');--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"status" "sync_run_status",
	"triggered_by" "sync_run_trigger" DEFAULT 'cron' NOT NULL,
	"total_parcours_scanned" integer DEFAULT 0 NOT NULL,
	"total_parcours_updated" integer DEFAULT 0 NOT NULL,
	"total_errors" integer DEFAULT 0 NOT NULL,
	"error_summary" text
);
--> statement-breakpoint
CREATE TABLE "sync_run_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_run_id" uuid NOT NULL,
	"parcours_id" uuid NOT NULL,
	"step_before" "step",
	"step_after" "step",
	"status_before" "status",
	"status_after" "status",
	"ds_status_changes" jsonb,
	"step_advanced" boolean DEFAULT false NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sync_run_entries" ADD CONSTRAINT "sync_run_entries_sync_run_id_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."sync_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_run_entries" ADD CONSTRAINT "sync_run_entries_parcours_id_parcours_prevention_id_fk" FOREIGN KEY ("parcours_id") REFERENCES "public"."parcours_prevention"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sync_runs_started_at_idx" ON "sync_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "sync_run_entries_sync_run_id_idx" ON "sync_run_entries" USING btree ("sync_run_id");--> statement-breakpoint
CREATE INDEX "sync_run_entries_parcours_id_idx" ON "sync_run_entries" USING btree ("parcours_id");