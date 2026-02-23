import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";

/**
 * Retourne les données RGA effectives d'un parcours :
 * - Données agent si elles existent (prioritaires, éditées par AMO ou allers-vers)
 * - Sinon données initiales du simulateur
 */
export function getEffectiveRGAData(parcours: {
  rgaSimulationData?: RGASimulationData | null;
  rgaSimulationDataAgent?: RGASimulationData | null;
}): RGASimulationData | null {
  return parcours.rgaSimulationDataAgent ?? parcours.rgaSimulationData ?? null;
}
