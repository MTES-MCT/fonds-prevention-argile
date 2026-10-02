ALTER TABLE "sync_runs" ADD COLUMN "bilan_annotations_dn" jsonb;--> statement-breakpoint
ALTER TABLE "sync_run_entries" ADD COLUMN "annotations_dn" jsonb;