ALTER TABLE "dossiers_demarches_simplifiees" ADD COLUMN "avis_impot_controle_at" timestamp;--> statement-breakpoint
ALTER TABLE "dossiers_demarches_simplifiees" ADD COLUMN "avis_impot_statut" varchar(20);--> statement-breakpoint
ALTER TABLE "dossiers_demarches_simplifiees" ADD COLUMN "avis_impot_champs_modifies_at" timestamp;