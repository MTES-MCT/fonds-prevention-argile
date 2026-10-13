ALTER TABLE "dossiers_demarches_simplifiees" ADD COLUMN "chorus_tiers_fournisseur" varchar(30);--> statement-breakpoint
ALTER TABLE "dossiers_demarches_simplifiees" ADD COLUMN "chorus_tiers_fournisseur_at" timestamp;--> statement-breakpoint
ALTER TABLE "dossiers_demarches_simplifiees" ADD COLUMN "chorus_numero_ej" varchar(30);--> statement-breakpoint
ALTER TABLE "dossiers_demarches_simplifiees" ADD COLUMN "chorus_numero_ej_at" timestamp;--> statement-breakpoint
ALTER TABLE "dossiers_demarches_simplifiees" ADD COLUMN "chorus_montant_subvention" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "dossiers_demarches_simplifiees" ADD COLUMN "chorus_montant_subvention_at" timestamp;