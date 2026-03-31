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
 * Le shapefile doit etre en Lambert 93 (EPSG:2154), il sera reprojete en WGS84 (EPSG:4326).
 * Le champ ALEA sera normalise en minuscules (fort, moyen, faible).
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { rawClient } from "@/shared/database/client";

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

  // Etape 1: Vider la table existante
  console.log("\n1/4 - Vidage de la table rga_zones...");
  await rawClient`TRUNCATE TABLE rga_zones RESTART IDENTITY`;
  console.log("   Table videe.");

  // Etape 2: Importer le shapefile avec ogr2ogr
  console.log("\n2/4 - Import du shapefile via ogr2ogr...");
  console.log("   (reprojection Lambert 93 -> WGS84)");

  const ogr2ogrCmd = [
    "ogr2ogr",
    "-f",
    "PostgreSQL",
    `PG:${pgConnection}`,
    shapefilePath,
    "-nln",
    "rga_zones",
    "-nlt",
    "PROMOTE_TO_MULTI",
    "-s_srs",
    "EPSG:2154",
    "-t_srs",
    "EPSG:4326",
    "-lco",
    "GEOMETRY_NAME=geom",
    "-append",
    "-progress",
  ].join(" ");

  try {
    execSync(ogr2ogrCmd, { stdio: "inherit" });
  } catch {
    console.error("Erreur lors de l'import ogr2ogr. Verifiez que gdal/ogr2ogr est installe.");
    console.error("Installation: brew install gdal (macOS) ou apt install gdal-bin (Linux)");
    process.exit(1);
  }

  // Etape 3: Normaliser les valeurs d'alea en minuscules
  console.log("\n3/4 - Normalisation des valeurs d'alea...");
  await rawClient`UPDATE rga_zones SET alea = LOWER(alea)`;
  console.log("   Valeurs normalisees (fort, moyen, faible).");

  // Etape 4: Statistiques
  console.log("\n4/4 - Statistiques...");
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
