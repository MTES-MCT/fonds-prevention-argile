CREATE TABLE "catnat_decisions" (
	"code_insee" text NOT NULL,
	"libelle_commune" text NOT NULL,
	"date_arrete" date NOT NULL,
	"date_publication_jo" date NOT NULL,
	"date_debut_evt" date NOT NULL,
	"date_fin_evt" date NOT NULL,
	"decision" text NOT NULL,
	"motif" text,
	"source" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "catnat_decisions_pk" PRIMARY KEY("code_insee","date_arrete","date_debut_evt")
);
