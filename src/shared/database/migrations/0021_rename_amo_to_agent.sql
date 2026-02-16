ALTER TABLE "parcours_prevention" RENAME COLUMN "rga_simulation_data_amo" TO "rga_simulation_data_agent";--> statement-breakpoint
ALTER TABLE "parcours_prevention" RENAME COLUMN "rga_simulation_amo_edited_at" TO "rga_simulation_agent_edited_at";--> statement-breakpoint
ALTER TABLE "parcours_prevention" RENAME COLUMN "rga_simulation_amo_edited_by" TO "rga_simulation_agent_edited_by";--> statement-breakpoint
ALTER TABLE "parcours_prevention" DROP CONSTRAINT "parcours_prevention_rga_simulation_amo_edited_by_agents_id_fk";--> statement-breakpoint
ALTER TABLE "parcours_prevention" ADD CONSTRAINT "parcours_prevention_rga_simulation_agent_edited_by_agents_id_fk" FOREIGN KEY ("rga_simulation_agent_edited_by") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;