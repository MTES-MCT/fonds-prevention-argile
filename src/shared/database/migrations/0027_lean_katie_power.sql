CREATE TABLE IF NOT EXISTS "rga_zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"alea" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "fc_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "claim_token" varchar(128);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "claim_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "claimed_at" timestamp;--> statement-breakpoint
ALTER TABLE "parcours_prevention" ADD COLUMN "created_by_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "parcours_prevention" ADD CONSTRAINT "parcours_prevention_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_claim_token_unique" UNIQUE("claim_token");