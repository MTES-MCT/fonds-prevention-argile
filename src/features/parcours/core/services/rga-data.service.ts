import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";

/**
 * Retourne les données RGA effectives d'un parcours :
 * - Données AMO si elles existent (prioritaires)
 * - Sinon données initiales du simulateur
 */
export function getEffectiveRGAData(parcours: {
  rgaSimulationData?: RGASimulationData | null;
  rgaSimulationDataAmo?: RGASimulationData | null;
}): RGASimulationData | null {
  return parcours.rgaSimulationDataAmo ?? parcours.rgaSimulationData ?? null;
}
