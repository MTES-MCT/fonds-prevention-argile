// Réexport depuis le Shared Kernel
export type {
  RGASimulationData,
  RGADeletionReason,
  PartialRGASimulationData,
} from "@/shared/domain/types/rga-simulation.types";

// Réexport des types revenus
export {
  type TrancheRevenuRga,
  type SeuilsRevenuRga,
  calculerTrancheRevenu,
  getSeuilsRevenu,
  isRegionIDF,
} from "@/shared/domain/types/rga-revenus.types";
