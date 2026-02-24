CREATE TABLE "prospect_qualifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parcours_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"actions_realisees" text[] NOT NULL,
	"raisons_ineligibilite" text[],
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prospect_qualifications" ADD CONSTRAINT "prospect_qualifications_parcours_id_parcours_prevention_id_fk" FOREIGN KEY ("parcours_id") REFERENCES "public"."parcours_prevention"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_qualifications" ADD CONSTRAINT "prospect_qualifications_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prospect_qualifications_parcours_id_idx" ON "prospect_qualifications" USING btree ("parcours_id");