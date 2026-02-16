CREATE TYPE "public"."situation_particulier" AS ENUM('prospect', 'eligible', 'archive');--> statement-breakpoint
ALTER TABLE "parcours_prevention" ADD COLUMN "situation_particulier" "situation_particulier" DEFAULT 'prospect' NOT NULL;--> statement-breakpoint
ALTER TABLE "parcours_prevention" ADD COLUMN "rga_simulation_data_amo" jsonb;--> statement-breakpoint
ALTER TABLE "parcours_prevention" ADD COLUMN "rga_simulation_amo_edited_at" timestamp;--> statement-breakpoint
ALTER TABLE "parcours_prevention" ADD COLUMN "rga_simulation_amo_edited_by" uuid;--> statement-breakpoint
ALTER TABLE "parcours_prevention" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "parcours_prevention" ADD COLUMN "archive_reason" text;--> statement-breakpoint
ALTER TABLE "parcours_prevention" ADD CONSTRAINT "parcours_prevention_rga_simulation_amo_edited_by_agents_id_fk" FOREIGN KEY ("rga_simulation_amo_edited_by") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;