CREATE TABLE "allers_vers_departements" (
	"allers_vers_id" uuid NOT NULL,
	"code_departement" text NOT NULL,
	CONSTRAINT "allers_vers_departements_allers_vers_id_code_departement_pk" PRIMARY KEY("allers_vers_id","code_departement")
);
--> statement-breakpoint
CREATE TABLE "allers_vers_epci" (
	"allers_vers_id" uuid NOT NULL,
	"code_epci" text NOT NULL,
	CONSTRAINT "allers_vers_epci_allers_vers_id_code_epci_pk" PRIMARY KEY("allers_vers_id","code_epci")
);
--> statement-breakpoint
CREATE TABLE "allers_vers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" text NOT NULL,
	"emails" text[] NOT NULL,
	"telephone" text DEFAULT '' NOT NULL,
	"adresse" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "allers_vers_departements" ADD CONSTRAINT "allers_vers_departements_allers_vers_id_allers_vers_id_fk" FOREIGN KEY ("allers_vers_id") REFERENCES "public"."allers_vers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allers_vers_epci" ADD CONSTRAINT "allers_vers_epci_allers_vers_id_allers_vers_id_fk" FOREIGN KEY ("allers_vers_id") REFERENCES "public"."allers_vers"("id") ON DELETE cascade ON UPDATE no action;