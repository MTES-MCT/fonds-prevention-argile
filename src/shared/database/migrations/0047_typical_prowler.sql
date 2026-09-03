ALTER TABLE "prospect_qualifications" ALTER COLUMN "agent_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "desactive_at" timestamp;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "desactive_par" uuid;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "desactive_raison" text;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_desactive_par_agents_id_fk" FOREIGN KEY ("desactive_par") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;