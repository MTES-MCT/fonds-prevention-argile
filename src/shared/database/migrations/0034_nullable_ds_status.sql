ALTER TABLE "dossiers_demarches_simplifiees" ALTER COLUMN "ds_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "dossiers_demarches_simplifiees" ALTER COLUMN "ds_status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "dossiers_demarches_simplifiees" ADD COLUMN "instructed_at" timestamp;--> statement-breakpoint
-- Backfill : avant cette migration, tout dossier etait cree directement en EN_CONSTRUCTION
-- (faux depot). Un dossier reellement depose a forcement ete synchronise au moins une fois
-- (last_sync_at renseigne). On repasse donc a NULL ("en cours de creation") les dossiers
-- jamais synchronises, qui n'ont en realite jamais ete soumis a la DDT.
UPDATE "dossiers_demarches_simplifiees" SET "ds_status" = NULL WHERE "last_sync_at" IS NULL;