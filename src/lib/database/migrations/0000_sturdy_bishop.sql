CREATE TYPE "public"."ds_status" AS ENUM('en_construction', 'en_instruction', 'accepte', 'refuse', 'classe_sans_suite', 'non_accessible');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('TODO', 'EN_INSTRUCTION', 'VALIDE');--> statement-breakpoint
CREATE TYPE "public"."statut_validation_amo" AS ENUM('en_attente', 'valide', 'refuse');--> statement-breakpoint
CREATE TYPE "public"."step" AS ENUM('CHOIX_AMO', 'ELIGIBILITE', 'DIAGNOSTIC', 'DEVIS', 'FACTURES');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fc_id" varchar(255) NOT NULL,
	"code_insee" varchar(5),
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
CREATE TABLE "email_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"departement" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_notifications_email_unique" UNIQUE("email")
);
--> statement-breakpoint
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
CREATE TABLE "parcours_amo_validations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parcours_id" uuid NOT NULL,
	"entreprise_amo_id" uuid NOT NULL,
	"statut" "statut_validation_amo" DEFAULT 'en_attente' NOT NULL,
	"commentaire" text,
	"choisie_at" timestamp DEFAULT now() NOT NULL,
	"validee_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "parcours_amo_validations_parcours_id_unique" UNIQUE("parcours_id")
);
--> statement-breakpoint
ALTER TABLE "parcours_prevention" ADD CONSTRAINT "parcours_prevention_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossiers_demarches_simplifiees" ADD CONSTRAINT "dossiers_demarches_simplifiees_parcours_id_parcours_prevention_id_fk" FOREIGN KEY ("parcours_id") REFERENCES "public"."parcours_prevention"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entreprises_amo_communes" ADD CONSTRAINT "entreprises_amo_communes_entreprise_amo_id_entreprises_amo_id_fk" FOREIGN KEY ("entreprise_amo_id") REFERENCES "public"."entreprises_amo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcours_amo_validations" ADD CONSTRAINT "parcours_amo_validations_parcours_id_parcours_prevention_id_fk" FOREIGN KEY ("parcours_id") REFERENCES "public"."parcours_prevention"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcours_amo_validations" ADD CONSTRAINT "parcours_amo_validations_entreprise_amo_id_entreprises_amo_id_fk" FOREIGN KEY ("entreprise_amo_id") REFERENCES "public"."entreprises_amo"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "code_insee_idx" ON "entreprises_amo_communes" USING btree ("code_insee");