CREATE TYPE "public"."source_acquisition" AS ENUM('ddt', 'amo', 'aller_vers', 'ecfr', 'flyers', 'medias', 'bulletin_communal', 'pros_batiment_immobilier', 'reunion_publique_salon', 'moteur_recherche', 'autre');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "source_acquisition" "source_acquisition";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "source_acquisition_precision" text;
