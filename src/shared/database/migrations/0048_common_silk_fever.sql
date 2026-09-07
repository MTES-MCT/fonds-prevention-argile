CREATE TABLE "vulnerabilite_simulations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"code_departement" varchar(3),
	"alea_rga" varchar(16),
	"pente_terrain" varchar(32),
	"reseaux_enterres" varchar(32),
	"gravier_proprete" varchar(32),
	"gouttieres" varchar(32),
	"arbre_proximite" varchar(32),
	"arbre_essence" varchar(32),
	"haies" varchar(32),
	"vegetation_pied_facade" varchar(32),
	"mitoyennete" varchar(48),
	"ensoleillement" varchar(32),
	"score_global" integer NOT NULL,
	"score_par_categorie" jsonb
);
--> statement-breakpoint
ALTER TABLE "parcours_prevention" ADD COLUMN "vulnerabilite_simulation_id" uuid;--> statement-breakpoint
CREATE INDEX "vulnerabilite_simulations_created_at_idx" ON "vulnerabilite_simulations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "vulnerabilite_simulations_code_departement_idx" ON "vulnerabilite_simulations" USING btree ("code_departement");--> statement-breakpoint
ALTER TABLE "parcours_prevention" ADD CONSTRAINT "parcours_prevention_vulnerabilite_simulation_id_vulnerabilite_simulations_id_fk" FOREIGN KEY ("vulnerabilite_simulation_id") REFERENCES "public"."vulnerabilite_simulations"("id") ON DELETE set null ON UPDATE no action;