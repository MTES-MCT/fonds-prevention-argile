CREATE TYPE "public"."ds_status" AS ENUM('en_construction', 'en_instruction', 'accepte', 'refuse', 'classe_sans_suite');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('TODO', 'EN_INSTRUCTION', 'VALIDE');--> statement-breakpoint
CREATE TYPE "public"."step" AS ENUM('ELIGIBILITE', 'DIAGNOSTIC', 'DEVIS', 'FACTURES');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fc_id" varchar(255) NOT NULL,
	"last_login" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_fc_id_unique" UNIQUE("fc_id")
);
--> statement-breakpoint
CREATE TABLE "parcours_prevention" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"current_step" "step" DEFAULT 'ELIGIBILITE' NOT NULL,
	"current_status" "status" DEFAULT 'TODO' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "parcours_prevention_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "dossiers_demarches_simplifiees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parcours_id" uuid NOT NULL,
	"step" "step" NOT NULL,
	"ds_number" varchar(50),
	"ds_id" varchar(50),
	"ds_demarche_id" varchar(50) NOT NULL,
	"ds_status" "ds_status" DEFAULT 'en_construction' NOT NULL,
	"submitted_at" timestamp,
	"processed_at" timestamp,
	"ds_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_sync_at" timestamp,
	CONSTRAINT "dossiers_demarches_simplifiees_ds_number_unique" UNIQUE("ds_number")
);
--> statement-breakpoint
ALTER TABLE "parcours_prevention" ADD CONSTRAINT "parcours_prevention_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossiers_demarches_simplifiees" ADD CONSTRAINT "dossiers_demarches_simplifiees_parcours_id_parcours_prevention_id_fk" FOREIGN KEY ("parcours_id") REFERENCES "public"."parcours_prevention"("id") ON DELETE cascade ON UPDATE no action;