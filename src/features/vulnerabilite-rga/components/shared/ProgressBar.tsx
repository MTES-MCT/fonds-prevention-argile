"use client";

interface ProgressBarProps {
  currentStep: number | null;
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  if (currentStep === null) return null;

  return (
    // fr-mb-2w réduit la marge par défaut du stepper DSFR (2rem, !important donc à écraser
    // explicitement) — un peu plus resserré avec le titre de la question qui suit.
    <div className="fr-stepper fr-mb-2w">
      <span className="fr-stepper__state">
        Simulation de vulnérabilité - {currentStep}/{totalSteps}
      </span>
      <div className="fr-stepper__steps" data-fr-current-step={currentStep} data-fr-steps={totalSteps}></div>
    </div>
  );
}
