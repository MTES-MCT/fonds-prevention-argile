/**
 * Utilitaires géographiques
 */

import type { Coordinates } from "@/shared/types";

/**
 * Point GeoJSON (format standard des APIs géo)
 */
export interface GeoJsonPoint {
  type: "Point";
  coordinates: [number, number]; // [lon, lat]
}

/**
 * Extrait les coordonnées du format GeoJSON vers notre format interne
 * GeoJSON utilise [lon, lat], nous utilisons {lat, lon}
 */
export function extractCoordinates(centre?: GeoJsonPoint): Coordinates | undefined {
  if (!centre?.coordinates) return undefined;
  const [lon, lat] = centre.coordinates;
  return { lat, lon };
}

/**
 * Calcule le centroïde (barycentre) d'un ensemble de coordonnées
 */
export function calculateCentroid(coordinates: Coordinates[]): Coordinates | undefined {
  const valid = coordinates.filter((c) => c.lat && c.lon);
  if (valid.length === 0) return undefined;

  const sum = valid.reduce((acc, c) => ({ lat: acc.lat + c.lat, lon: acc.lon + c.lon }), { lat: 0, lon: 0 });

  return {
    lat: Number((sum.lat / valid.length).toFixed(6)),
    lon: Number((sum.lon / valid.length).toFixed(6)),
  };
}

/**
 * Calcule la distance entre deux points en km (formule de Haversine)
 */
export function calculateDistance(from: Coordinates, to: Coordinates): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
