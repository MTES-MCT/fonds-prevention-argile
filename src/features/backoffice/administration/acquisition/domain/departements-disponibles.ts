import { getDepartementName } from "@/shared/constants/departements.constants";
import { comparerDepartementsFondsEnTete } from "@/shared/constants/rga.constants";
import type { DepartementDisponible } from "./types";

/**
 * Liste du filtre département, à partir du nombre de parcours par code normalisé (« 3 »).
 * Seuls les départements ayant des parcours y figurent, ceux du fonds en tête.
 */
export function ordonnerDepartementsDisponibles(parcoursParDepartement: Map<string, number>): DepartementDisponible[] {
  return [...parcoursParDepartement.entries()]
    .sort(([a], [b]) => comparerDepartementsFondsEnTete(a, b))
    .map(([code, nombreParcours]) => ({ code, nom: getDepartementName(code), nombreParcours }));
}
