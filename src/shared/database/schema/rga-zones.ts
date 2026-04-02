import { pgTable, serial, text } from "drizzle-orm/pg-core";

/**
 * Table des zones d'alea retrait-gonflement des argiles (RGA)
 * Source: Georisques - https://www.georisques.gouv.fr/donnees/bases-de-donnees/retrait-gonflement-des-argiles-version-2026
 *
 * La colonne geometry `geom` (MultiPolygon, SRID 4326) est geree par la migration SQL manuelle
 * (0026_postgis_rga_zones.sql) car Drizzle ne supporte pas les types PostGIS.
 *
 * L'import se fait via ogr2ogr depuis le shapefile national (Lambert 93 -> WGS84).
 * La requete spatiale utilise ST_Intersects avec un index GIST.
 */
export const rgaZones = pgTable("rga_zones", {
  id: serial("id").primaryKey(),
  alea: text("alea").notNull(), // 'fort', 'moyen', 'faible'
});

export type RgaZone = typeof rgaZones.$inferSelect;
