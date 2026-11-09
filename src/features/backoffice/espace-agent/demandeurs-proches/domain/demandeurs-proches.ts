import { calculateDistance } from "@/shared/utils/geo.utils";
import type { PositionLogement } from "./position-logement";

export interface Candidat<T> {
  nom: string;
  position: PositionLogement;
  donnees: T;
}

export interface Voisin<T> extends Candidat<T> {
  distanceKm: number;
}

/** Les plus proches d'abord, à vol d'oiseau ; à distance égale, par nom. */
export function plusProches<T>(origine: PositionLogement, candidats: Candidat<T>[], nombre: number): Voisin<T>[] {
  return candidats
    .map((candidat) => ({ ...candidat, distanceKm: calculateDistance(origine, candidat.position) }))
    .sort((a, b) => a.distanceKm - b.distanceKm || a.nom.localeCompare(b.nom, "fr"))
    .slice(0, nombre);
}

const DECIMALE = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

/** Libellé de distance ; une position au centre d'une commune n'autorise qu'un ordre de grandeur. */
export function formaterDistance(distanceKm: number, approximative: boolean): string {
  if (approximative) return `environ ${Math.max(1, Math.round(distanceKm))} km`;
  if (distanceKm < 1) return "moins d'1 km";
  const auDixieme = Math.round(distanceKm * 10) / 10;
  return auDixieme < 10 ? `${DECIMALE.format(auDixieme)} km` : `${Math.round(distanceKm)} km`;
}
