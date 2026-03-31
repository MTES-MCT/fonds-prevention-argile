import { sql } from "drizzle-orm";
import { db } from "../client";
import type { BdnbAleaArgile } from "@/shared/adapters/bdnb";

/**
 * Repository pour les zones d'alea RGA (PostGIS)
 *
 * Utilise db.execute() avec du SQL brut car Drizzle ne supporte pas
 * les fonctions spatiales PostGIS (ST_Intersects, ST_MakePoint).
 */
class RgaZonesRepository {
  /**
   * Trouve le niveau d'alea RGA pour des coordonnees donnees (WGS84)
   *
   * Si le point tombe dans plusieurs zones (chevauchement), retourne
   * l'alea le plus eleve (principe de precaution : fort > moyen > faible).
   */
  async findAleaByCoordinates(lon: number, lat: number): Promise<BdnbAleaArgile> {
    const result = await db.execute<{ alea: string }>(sql`
      SELECT alea FROM rga_zones
      WHERE ST_Intersects(geom, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326))
      ORDER BY CASE alea WHEN 'fort' THEN 1 WHEN 'moyen' THEN 2 WHEN 'faible' THEN 3 END
      LIMIT 1
    `);

    if (result.length === 0) {
      return null;
    }

    return result[0].alea as BdnbAleaArgile;
  }
}

export const rgaZonesRepository = new RgaZonesRepository();
