import { parseCoordinatesString } from "@/shared/utils/geo.utils";
import { asString } from "@/shared/utils/object.utils";
import {
  normaliserCodeCommune,
  type CentresCommunes,
} from "@/features/backoffice/administration/demandeurs/domain/carte-communes.utils";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";

export interface PositionLogement {
  lat: number;
  lon: number;
  /** Centre de la commune, faute de point GPS. */
  approximative: boolean;
}

type Logement = Partial<RGASimulationData["logement"]> | undefined;

function pointGps(logement: Logement): { lat: number; lon: number } | null {
  const point = parseCoordinatesString(asString(logement?.coordonnees));
  if (!point || Math.abs(point.lat) > 90 || Math.abs(point.lon) > 180) return null;
  return point;
}

/** Code INSEE à placer au centre de sa commune, quand le logement n'a pas de point GPS. */
export function communeSansPointGps(logement: Logement): string | null {
  return pointGps(logement) ? null : normaliserCodeCommune(logement?.commune);
}

export function positionDuLogement(logement: Logement, centres: CentresCommunes): PositionLogement | null {
  const point = pointGps(logement);
  if (point) return { ...point, approximative: false };

  const code = normaliserCodeCommune(logement?.commune);
  const centre = code ? centres[code] : undefined;
  return centre ? { lon: centre[0], lat: centre[1], approximative: true } : null;
}
