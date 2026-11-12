CREATE TABLE "experts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" varchar(255) NOT NULL,
	"siret" varchar(14) NOT NULL,
	"date_validation_dhup" date,
	"contact_interne_nom" varchar(255),
	"contact_interne_email" varchar(255),
	"contact_interne_telephone" varchar(20),
	"structure_id" uuid NOT NULL,
	"desactive_at" timestamp,
	"desactive_par" uuid,
	"desactive_raison" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "experts_siret_unique" UNIQUE("siret"),
	CONSTRAINT "experts_structure_id_unique" UNIQUE("structure_id")
);
--> statement-breakpoint
CREATE TABLE "experts_departements" (
	"expert_id" uuid NOT NULL,
	"code_departement" text NOT NULL,
	"email" varchar(255),
	"telephone" varchar(20),
	CONSTRAINT "experts_departements_expert_id_code_departement_pk" PRIMARY KEY("expert_id","code_departement")
);
--> statement-breakpoint
ALTER TABLE "experts" ADD CONSTRAINT "experts_structure_id_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."structures"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experts" ADD CONSTRAINT "experts_desactive_par_agents_id_fk" FOREIGN KEY ("desactive_par") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experts_departements" ADD CONSTRAINT "experts_departements_expert_id_experts_id_fk" FOREIGN KEY ("expert_id") REFERENCES "public"."experts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "experts_departements_code_departement_idx" ON "experts_departements" USING btree ("code_departement");