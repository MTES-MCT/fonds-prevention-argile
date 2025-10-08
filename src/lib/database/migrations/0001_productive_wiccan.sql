CREATE TABLE "entreprises_amo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"telephone" varchar(20) NOT NULL,
	"adresse" varchar(500) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entreprises_amo_communes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entreprise_amo_id" uuid NOT NULL,
	"code_insee" varchar(5) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dossiers_demarches_simplifiees" DROP CONSTRAINT "dossiers_demarches_simplifiees_parcours_id_parcours_prevention_";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "code_insee" varchar(5);--> statement-breakpoint
ALTER TABLE "entreprises_amo_communes" ADD CONSTRAINT "entreprises_amo_communes_entreprise_amo_id_entreprises_amo_id_fk" FOREIGN KEY ("entreprise_amo_id") REFERENCES "public"."entreprises_amo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "code_insee_idx" ON "entreprises_amo_communes" USING btree ("code_insee");--> statement-breakpoint
ALTER TABLE "dossiers_demarches_simplifiees" ADD CONSTRAINT "dossiers_demarches_simplifiees_parcours_id_parcours_prevention_id_fk" FOREIGN KEY ("parcours_id") REFERENCES "public"."parcours_prevention"("id") ON DELETE cascade ON UPDATE no action;