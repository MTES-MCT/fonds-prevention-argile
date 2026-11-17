CREATE TABLE "avis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sujet" varchar(32) NOT NULL,
	"note" smallint NOT NULL,
	"commentaire" text,
	"origine" varchar(16) NOT NULL,
	"parcours_id" uuid,
	"simulation_eligible" boolean,
	"code_departement" varchar(3),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "avis" ADD CONSTRAINT "avis_parcours_id_parcours_prevention_id_fk" FOREIGN KEY ("parcours_id") REFERENCES "public"."parcours_prevention"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "avis_parcours_sujet_idx" ON "avis" USING btree ("parcours_id","sujet");--> statement-breakpoint
CREATE INDEX "avis_sujet_idx" ON "avis" USING btree ("sujet");--> statement-breakpoint
CREATE INDEX "avis_created_at_idx" ON "avis" USING btree ("created_at");