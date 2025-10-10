CREATE TABLE "amo_validation_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parcours_amo_validation_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	CONSTRAINT "amo_validation_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "parcours_amo_validations" ALTER COLUMN "statut" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "parcours_amo_validations" ALTER COLUMN "statut" SET DEFAULT 'en_attente'::text;--> statement-breakpoint
DROP TYPE "public"."statut_validation_amo";--> statement-breakpoint
CREATE TYPE "public"."statut_validation_amo" AS ENUM('en_attente', 'logement_eligible', 'logement_non_eligible', 'accompagnement_refuse');--> statement-breakpoint
ALTER TABLE "parcours_amo_validations" ALTER COLUMN "statut" SET DEFAULT 'en_attente'::"public"."statut_validation_amo";--> statement-breakpoint
ALTER TABLE "parcours_amo_validations" ALTER COLUMN "statut" SET DATA TYPE "public"."statut_validation_amo" USING "statut"::"public"."statut_validation_amo";--> statement-breakpoint
ALTER TABLE "amo_validation_tokens" ADD CONSTRAINT "amo_validation_tokens_parcours_amo_validation_id_parcours_amo_validations_id_fk" FOREIGN KEY ("parcours_amo_validation_id") REFERENCES "public"."parcours_amo_validations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "amo_validation_token_idx" ON "amo_validation_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "amo_validation_validation_id_idx" ON "amo_validation_tokens" USING btree ("parcours_amo_validation_id");