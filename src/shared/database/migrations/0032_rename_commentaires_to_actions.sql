ALTER TABLE "parcours_commentaires" RENAME TO "parcours_actions";--> statement-breakpoint
ALTER TABLE "parcours_actions" RENAME CONSTRAINT "parcours_commentaires_parcours_id_parcours_prevention_id_fk" TO "parcours_actions_parcours_id_parcours_prevention_id_fk";--> statement-breakpoint
ALTER TABLE "parcours_actions" RENAME CONSTRAINT "parcours_commentaires_agent_id_agents_id_fk" TO "parcours_actions_agent_id_agents_id_fk";--> statement-breakpoint
ALTER TABLE "parcours_actions" ADD COLUMN "action_type" text;--> statement-breakpoint
ALTER TABLE "parcours_actions" ADD COLUMN "action_precision" text;--> statement-breakpoint
UPDATE "parcours_actions" SET "action_type" = 'commentaire_libre' WHERE "action_type" IS NULL;--> statement-breakpoint
ALTER TABLE "parcours_actions" ALTER COLUMN "action_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "parcours_actions" ALTER COLUMN "message" DROP NOT NULL;
