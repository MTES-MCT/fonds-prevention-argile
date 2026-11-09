import { parseCoordinatesString } from "@/shared/utils/geo.utils";
import { asString } from "@/shared/utils/object.utils";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";

export interface PositionLogement {
  lat: number;
  lon: number;
}

/** Point GPS du logement ; le simulateur et la création par un agent l'écrivent dès qu'une adresse est choisie. */
export function positionDuLogement(
  logement: Partial<RGASimulationData["logement"]> | undefined
): PositionLogement | null {
  const point = parseCoordinatesString(asString(logement?.coordonnees));
  if (!point || Math.abs(point.lat) > 90 || Math.abs(point.lon) > 180) return null;
  return point;
}
