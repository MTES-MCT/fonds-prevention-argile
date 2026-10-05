import type { BdnbAleaArgile } from "@/shared/adapters/bdnb";

/** Libellés contractuels : options de la liste « Vérification de la zone d'aléa avec l'adresse renseignée ». */
export const ZONES_ALEA_DN = {
  FORT: "Fort",
  MOYEN: "Moyen",
  FAIBLE: "Faible",
  HORS_ZONE: "Hors zone",
} as const;

export type ZoneAleaDn = (typeof ZONES_ALEA_DN)[keyof typeof ZONES_ALEA_DN];

/** `null` vaut hors zone : le point ne tombe dans aucun polygone RGA. */
export function zoneAleaDn(alea: BdnbAleaArgile): ZoneAleaDn {
  if (alea === "fort") return ZONES_ALEA_DN.FORT;
  if (alea === "moyen") return ZONES_ALEA_DN.MOYEN;
  if (alea === "faible") return ZONES_ALEA_DN.FAIBLE;
  return ZONES_ALEA_DN.HORS_ZONE;
}

export interface PointGps {
  lat: number;
  lon: number;
}

export interface AdresseMaisonDeclaree {
  /** « Adresse postale de la maison », texte libre du formulaire DN. */
  texte: string | null;
  /** Code INSEE et nom de la commune déclarée dans DN. */
  communeCode: string | null;
  communeNom: string | null;
}

// Au-dessous, BAN a deviné : le point peut tomber sur une autre rue, voire une autre zone d'aléa.
export const SCORE_GEOCODAGE_MINIMUM = 0.6;

export interface ResultatGeocodage {
  type: string;
  score: number;
  citycode: string;
  point: PointGps;
}

/** Retient un résultat BAN au numéro de rue, dans la commune déclarée, et assez sûr. */
export function pointFiable(resultat: ResultatGeocodage | null, communeCode: string | null): PointGps | null {
  if (!resultat || resultat.type !== "housenumber" || resultat.score < SCORE_GEOCODAGE_MINIMUM) return null;
  if (communeCode && resultat.citycode !== communeCode) return null;
  return resultat.point;
}

const GOOGLE_STREET_VIEW = "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=";
const GOOGLE_MAPS_RECHERCHE = "https://www.google.com/maps/search/?api=1&query=";

/** URL publique Google Maps (sans clé) : Street View au point géocodé, sinon recherche de l'adresse en texte. */
export function lienGoogleMaps(point: PointGps | null, adresse: AdresseMaisonDeclaree): string | null {
  // Street View exige des coordonnées : sans point fiable, seule la recherche en texte reste possible.
  if (point) return `${GOOGLE_STREET_VIEW}${point.lat},${point.lon}`;
  const texte = adresse.texte?.trim();
  if (!texte) return null;
  const requete = adresse.communeNom ? `${texte}, ${adresse.communeNom}` : texte;
  return `${GOOGLE_MAPS_RECHERCHE}${encodeURIComponent(requete)}`;
}
