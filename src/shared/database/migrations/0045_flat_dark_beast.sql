CREATE TABLE "ds_reconciliation_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ds_number" varchar(50) NOT NULL,
	"parcours_id" uuid,
	"step" "step",
	"verdict" varchar(40) NOT NULL,
	"ds_state" varchar(30),
	"detail" text,
	"observed_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" uuid,
	"resolution" varchar(30),
	CONSTRAINT "ds_reconciliation_observations_ds_number_unique" UNIQUE("ds_number")
);
--> statement-breakpoint
ALTER TABLE "ds_reconciliation_observations" ADD CONSTRAINT "ds_reconciliation_observations_parcours_id_parcours_prevention_id_fk" FOREIGN KEY ("parcours_id") REFERENCES "public"."parcours_prevention"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ds_reconciliation_observations" ADD CONSTRAINT "ds_reconciliation_observations_resolved_by_agents_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ds_reconciliation_observations_verdict_idx" ON "ds_reconciliation_observations" USING btree ("verdict");--> statement-breakpoint
CREATE INDEX "ds_reconciliation_observations_parcours_idx" ON "ds_reconciliation_observations" USING btree ("parcours_id");