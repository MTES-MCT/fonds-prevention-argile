CREATE TABLE "catastrophes_naturelles" (
	"code_national_catnat" text NOT NULL,
	"date_debut_evt" date NOT NULL,
	"date_fin_evt" date NOT NULL,
	"date_publication_arrete" date NOT NULL,
	"date_publication_jo" date NOT NULL,
	"libelle_risque_jo" text NOT NULL,
	"code_insee" text NOT NULL,
	"libelle_commune" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catastrophes_naturelles_code_national_catnat_code_insee_pk" PRIMARY KEY("code_national_catnat","code_insee")
);
--> statement-breakpoint
CREATE INDEX "catastrophes_naturelles_code_insee_idx" ON "catastrophes_naturelles" USING btree ("code_insee");--> statement-breakpoint
CREATE INDEX "catastrophes_naturelles_date_debut_evt_idx" ON "catastrophes_naturelles" USING btree ("date_debut_evt");--> statement-breakpoint
CREATE INDEX "catastrophes_naturelles_code_insee_date_idx" ON "catastrophes_naturelles" USING btree ("code_insee","date_debut_evt");--> statement-breakpoint
CREATE INDEX "catastrophes_naturelles_libelle_risque_idx" ON "catastrophes_naturelles" USING btree ("libelle_risque_jo");--> statement-breakpoint
CREATE INDEX "catastrophes_naturelles_code_national_idx" ON "catastrophes_naturelles" USING btree ("code_national_catnat");