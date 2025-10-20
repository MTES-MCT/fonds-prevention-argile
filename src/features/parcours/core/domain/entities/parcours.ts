import type { Step } from "../value-objects/step";
import type { Status } from "../value-objects/status";

/**
 * Entité Parcours de prévention
 */
export interface Parcours {
  id: string;
  userId: string;
  currentStep: Step;
  status: Status;
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
