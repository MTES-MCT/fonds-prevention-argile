ALTER TABLE "parcours_prevention" ADD COLUMN "rga_simulation_data" jsonb;--> statement-breakpoint
ALTER TABLE "parcours_prevention" ADD COLUMN "rga_simulation_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "parcours_prevention" ADD COLUMN "rga_data_deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "parcours_prevention" ADD COLUMN "rga_data_deletion_reason" text;