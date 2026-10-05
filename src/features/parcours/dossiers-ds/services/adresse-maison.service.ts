import { extractCoordinates, searchAddress } from "@/shared/adapters/ban";
import { rgaZonesRepository } from "@/shared/database/repositories";
import {
  lienGoogleMaps,
  pointFiable,
  zoneAleaDn,
  type AdresseMaisonDeclaree,
  type PointGps,
  type ZoneAleaDn,
} from "../domain/adresse-maison";

export interface LocalisationMaison {
  /** Point BAN retenu, null si l'adresse n'a pas pu être géocodée de façon sûre. */
  point: PointGps | null;
  /** Null sans point fiable ou si la recherche a échoué : jamais « Hors zone » par défaut. */
  zoneAlea: ZoneAleaDn | null;
  lienCarte: string | null;
}

async function geocoder(adresse: AdresseMaisonDeclaree): Promise<PointGps | null> {
  if (!adresse.texte?.trim()) return null;
  try {
    const [feature] = await searchAddress(adresse.texte, { limit: 1, citycode: adresse.communeCode ?? undefined });
    if (!feature) return null;
    const { type, score, citycode } = feature.properties;
    return pointFiable({ type, score, citycode, point: extractCoordinates(feature) }, adresse.communeCode);
  } catch (error) {
    // BAN indisponible : le lien retombe sur une recherche en texte, la zone n'est pas écrite.
    console.warn(
      "Géocodage BAN de l'adresse de la maison impossible :",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

async function zoneDuPoint(point: PointGps): Promise<ZoneAleaDn | null> {
  try {
    return zoneAleaDn(await rgaZonesRepository.findAleaByCoordinates(point.lon, point.lat));
  } catch (error) {
    console.warn("Recherche de la zone d'aléa impossible :", error instanceof Error ? error.message : error);
    return null;
  }
}

/** Situe la maison déclarée dans DN : point BAN, zone d'aléa RGA 2026 et lien Google Maps. */
export async function localiserMaison(adresse: AdresseMaisonDeclaree): Promise<LocalisationMaison> {
  const point = await geocoder(adresse);
  return {
    point,
    zoneAlea: point ? await zoneDuPoint(point) : null,
    lienCarte: lienGoogleMaps(point, adresse),
  };
}
