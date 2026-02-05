ALTER TYPE "public"."agent_role" ADD VALUE 'allers_vers';--> statement-breakpoint
ALTER TYPE "public"."agent_role" ADD VALUE 'amo_et_allers_vers';--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "allers_vers_id" uuid;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_allers_vers_id_allers_vers_id_fk" FOREIGN KEY ("allers_vers_id") REFERENCES "public"."allers_vers"("id") ON DELETE set null ON UPDATE no action;