CREATE TABLE "dossiers_ds_tentatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parcours_id" uuid NOT NULL,
	"step" "step" NOT NULL,
	"ds_number" varchar(50) NOT NULL,
	"ds_id" varchar(50),
	"ds_demarche_id" varchar(50),
	"origine" varchar(30) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dossiers_ds_tentatives_ds_number_unique" UNIQUE("ds_number")
);
--> statement-breakpoint
ALTER TABLE "dossiers_ds_tentatives" ADD CONSTRAINT "dossiers_ds_tentatives_parcours_id_parcours_prevention_id_fk" FOREIGN KEY ("parcours_id") REFERENCES "public"."parcours_prevention"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dossiers_ds_tentatives_parcours_step_idx" ON "dossiers_ds_tentatives" USING btree ("parcours_id","step");