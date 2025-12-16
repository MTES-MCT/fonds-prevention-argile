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
  rgaDataDeletedAt: Date | null;
  rgaDataDeletionReason: string | null;

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
