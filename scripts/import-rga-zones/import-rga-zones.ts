/**
 * Script d'import des zones d'alea RGA dans PostGIS
 *
 * Usage:
 *   pnpm rga:import <chemin-vers-shapefile.shp>
 *
 * Prerequis:
 *   - PostgreSQL avec extension PostGIS (docker-compose up -d postgres)
 *   - Migration 0026_postgis_rga_zones.sql appliquee
 *   - ogr2ogr installe (brew install gdal / apt install gdal-bin)
 *
 * Le shapefile (Georisques 2025/2026) est en Lambert 93 (EPSG:2154) avec un champ
 * `niveau` numerique (1=Faible, 2=Moyen, 3=Fort). Le script reprojette en WGS84
 * et convertit en texte (fort, moyen, faible) pour la table rga_zones.
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { rawClient } from "@/shared/database/client";

// Mapping du champ numerique "niveau" vers le texte "alea"
// Source: shapefile Georisques AleaRG_2025_Fxx_L93
const NIVEAU_TO_ALEA: Record<number, string> = {
  1: "faible",
  2: "moyen",
  3: "fort",
};

async function main() {
  const shapefilePath = process.argv[2];

  if (!shapefilePath) {
    console.error("Usage: pnpm rga:import <chemin-vers-shapefile.shp>");
    process.exit(1);
  }

  if (!existsSync(shapefilePath)) {
    console.error(`Fichier introuvable: ${shapefilePath}`);
    process.exit(1);
  }

  // Construire la chaine de connexion PostgreSQL pour ogr2ogr
  const pgConnection = buildPgConnectionString();

  console.log("=== Import des zones RGA ===");
  console.log(`Shapefile: ${shapefilePath}`);

  // Etape 1: Vider les tables
  console.log("\n1/5 - Vidage des tables...");
  await rawClient`DROP TABLE IF EXISTS rga_zones_import`;
  await rawClient`TRUNCATE TABLE rga_zones RESTART IDENTITY`;
  console.log("   Tables videes.");

  // Etape 2: Importer le shapefile dans une table temporaire
  // ogr2ogr cree ses propres colonnes (gid, insee_dep, niveau, surf_m2, wkb_geometry)
  console.log("\n2/5 - Import du shapefile via ogr2ogr (table temporaire)...");
  console.log("   (reprojection Lambert 93 -> WGS84, 121k polygones)");

  const ogr2ogrCmd = [
    "ogr2ogr",
    "-f", "PostgreSQL",
    `"PG:${pgConnection}"`,
    `"${shapefilePath}"`,
    "-nln", "rga_zones_import",
    "-nlt", "PROMOTE_TO_MULTI",
    "-t_srs", "EPSG:4326",
    "-lco", "GEOMETRY_NAME=geom",
    "-select", "niveau",
    "-overwrite",
    "-progress",
  ].join(" ");

  try {
    execSync(ogr2ogrCmd, { stdio: "inherit", shell: "/bin/bash" });
  } catch {
    console.error("Erreur lors de l'import ogr2ogr. Verifiez que gdal/ogr2ogr est installe.");
    console.error("Installation: brew install gdal (macOS) ou apt install gdal-bin (Linux)");
    process.exit(1);
  }

  // Etape 3: Transferer vers rga_zones avec mapping niveau -> alea
  console.log("\n3/5 - Mapping niveau -> alea...");
  console.log(`   Mapping: ${Object.entries(NIVEAU_TO_ALEA).map(([k, v]) => `${k}=${v}`).join(", ")}`);

  await rawClient`
    INSERT INTO rga_zones (alea, geom)
    SELECT
      CASE niveau
        WHEN 3 THEN 'fort'
        WHEN 2 THEN 'moyen'
        WHEN 1 THEN 'faible'
        ELSE 'faible'
      END,
      geom
    FROM rga_zones_import
  `;
  console.log("   Mapping termine.");

  // Etape 4: Nettoyage table temporaire
  console.log("\n4/5 - Nettoyage...");
  await rawClient`DROP TABLE IF EXISTS rga_zones_import`;
  console.log("   Table temporaire supprimee.");

  // Etape 5: Statistiques
  console.log("\n5/5 - Statistiques...");
  const countResult = await rawClient`SELECT COUNT(*) as total FROM rga_zones`;
  const total = countResult[0].total;

  const statsResult =
    await rawClient`SELECT alea, COUNT(*) as count FROM rga_zones GROUP BY alea ORDER BY alea`;

  console.log(`   Total: ${total} polygones importes`);
  for (const row of statsResult) {
    console.log(`   - ${row.alea}: ${row.count}`);
  }

  // Verification de l'index spatial
  const indexCheck = await rawClient`
    SELECT indexname FROM pg_indexes WHERE tablename = 'rga_zones' AND indexname = 'idx_rga_zones_geom'
  `;
  if (indexCheck.length > 0) {
    console.log("   Index spatial GIST: OK");
  } else {
    console.warn("   ATTENTION: Index spatial GIST manquant! Executez la migration 0026.");
  }

  console.log("\n=== Import termine avec succes ===");
  process.exit(0);
}

function buildPgConnectionString(): string {
  // Priorite 1: Scalingo
  if (process.env.SCALINGO_POSTGRESQL_URL) {
    return process.env.SCALINGO_POSTGRESQL_URL;
  }

  // Priorite 2: DATABASE_URL
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Priorite 3: Variables individuelles
  const host = process.env.DB_HOST ?? "localhost";
  const port = process.env.DB_PORT ?? "5433";
  const user = process.env.DB_USER ?? "fonds_argile_user";
  const password = process.env.DB_PASSWORD ?? "fonds_argile_password";
  const database = process.env.DB_NAME ?? "fonds_argile";

  return `host=${host} port=${port} dbname=${database} user=${user} password=${password}`;
}

main().catch((err) => {
  console.error("Erreur fatale:", err);
  process.exit(1);
});
