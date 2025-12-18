"use client";

interface ProgressBarProps {
  currentStep: number | null;
  totalSteps: number;
}

/**
 * Barre de progression du simulateur (8 étapes)
 */
export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  if (currentStep === null) return null;

  return (
    <div className="fr-stepper">
      <span className="fr-stepper__state">
        Étape {currentStep} sur {totalSteps}
      </span>
      <div className="fr-stepper__steps" data-fr-current-step={currentStep} data-fr-steps={totalSteps}></div>
    </div>
  );
}
