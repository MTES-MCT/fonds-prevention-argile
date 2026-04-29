CREATE TYPE "public"."attribution_amo_mode" AS ENUM('manuel', 'auto_obligatoire', 'auto_av_amo', 'aucun');--> statement-breakpoint
ALTER TYPE "public"."statut_validation_amo" ADD VALUE 'sans_amo';--> statement-breakpoint
ALTER TABLE "parcours_amo_validations" ALTER COLUMN "entreprise_amo_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "parcours_amo_validations" ADD COLUMN "attribution_mode" "attribution_amo_mode" DEFAULT 'manuel' NOT NULL;