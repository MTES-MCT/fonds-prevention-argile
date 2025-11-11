CREATE TABLE "entreprises_amo_epci" (
	"entreprise_amo_id" uuid NOT NULL,
	"code_epci" varchar(9) NOT NULL,
	CONSTRAINT "entreprises_amo_epci_entreprise_amo_id_code_epci_pk" PRIMARY KEY("entreprise_amo_id","code_epci")
);
--> statement-breakpoint
ALTER TABLE "entreprises_amo_epci" ADD CONSTRAINT "entreprises_amo_epci_entreprise_amo_id_entreprises_amo_id_fk" FOREIGN KEY ("entreprise_amo_id") REFERENCES "public"."entreprises_amo"("id") ON DELETE cascade ON UPDATE no action;