ALTER TABLE "agents" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "role" SET DEFAULT 'administrateur'::text;--> statement-breakpoint
-- Fusion du rôle ANALYSTE_DDT dans ANALYSTE : remap des agents avant la recréation de l'enum
UPDATE "agents" SET "role" = 'analyste' WHERE "role" = 'analyste_ddt';--> statement-breakpoint
DROP TYPE "public"."agent_role";--> statement-breakpoint
CREATE TYPE "public"."agent_role" AS ENUM('administrateur', 'super_administrateur', 'amo', 'analyste', 'allers_vers', 'amo_et_allers_vers');--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "role" SET DEFAULT 'administrateur'::"public"."agent_role";--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "role" SET DATA TYPE "public"."agent_role" USING "role"::"public"."agent_role";