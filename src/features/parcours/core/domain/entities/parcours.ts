import type { Step } from "../value-objects/step";
import type { Status } from "../value-objects/status";
import { RGASimulationData } from "@/features/simulateur";

/**
 * Entité Parcours de prévention
 */
export interface Parcours {
  id: string;
  userId: string;
  currentStep: Step;
  status: Status;

  rgaSimulationData: RGASimulationData | null;
  rgaSimulationCompletedAt: Date | null;
  /** Un agent a corrigé la simulation : sa version prime et ferme l'édition demandeur. */
  simulationCorrigeeParAgent: boolean;
  rgaDataDeletedAt: Date | null;
  rgaDataDeletionReason: string | null;

  /** Non-null = dossier archivé (inéligibilité, abandon…) : plus rien n'y est actionnable. */
  archivedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * État du parcours (step + status combinés)
 */
export interface ParcoursState {
  step: Step;
  status: Status;
}

/**
 * Parcours avec progression
 */
export interface ParcoursWithProgress extends Parcours {
  completedSteps: Step[];
  nextStep: Step | null;
  progressPercentage: number;
}
