import { rgaZonesRepository } from "@/shared/database/repositories";
import type { BdnbAleaArgile } from "@/shared/adapters/bdnb";

// Bornes approximatives de la France metropolitaine (WGS84)
const FRANCE_BOUNDS = {
  minLon: -5.5,
  maxLon: 10.0,
  minLat: 41.0,
  maxLat: 51.5,
};

/**
 * Determine le niveau d'alea RGA pour des coordonnees donnees
 * via requete spatiale PostGIS sur les polygones importes.
 *
 * Retourne null si :
 * - Les coordonnees sont hors de France metropolitaine
 * - Le point ne tombe dans aucune zone RGA
 * - Une erreur PostGIS survient (fallback BDNB)
 */
export async function getAleaByCoordinates(lat: number, lon: number): Promise<BdnbAleaArgile> {
  // Validation des coordonnees
  if (
    lon < FRANCE_BOUNDS.minLon ||
    lon > FRANCE_BOUNDS.maxLon ||
    lat < FRANCE_BOUNDS.minLat ||
    lat > FRANCE_BOUNDS.maxLat
  ) {
    return null;
  }

  try {
    return await rgaZonesRepository.findAleaByCoordinates(lon, lat);
  } catch (error) {
    console.error("[rga-alea] Erreur lors de la requete spatiale PostGIS:", error);
    return null;
  }
}
