CREATE TABLE "agent_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"departement_code" varchar(3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "role" SET DEFAULT 'administrateur'::text;--> statement-breakpoint
DROP TYPE "public"."agent_role";--> statement-breakpoint
CREATE TYPE "public"."agent_role" AS ENUM('administrateur', 'super_administrateur', 'amo');--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "role" SET DEFAULT 'administrateur'::"public"."agent_role";--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "role" SET DATA TYPE "public"."agent_role" USING "role"::"public"."agent_role";--> statement-breakpoint
ALTER TABLE "agent_permissions" ADD CONSTRAINT "agent_permissions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;