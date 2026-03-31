-- Migration manuelle : PostGIS + table rga_zones pour requete spatiale RGA 2026
-- Drizzle ne supporte pas CREATE EXTENSION ni les colonnes geometry

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS "rga_zones" (
  "id" serial PRIMARY KEY NOT NULL,
  "alea" text NOT NULL,
  "geom" geometry(MultiPolygon, 4326) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rga_zones_geom" ON "rga_zones" USING GIST ("geom");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rga_zones_alea" ON "rga_zones" ("alea");
