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

  const progression = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="fr-mb-4w">
      <p className="fr-text--sm fr-mb-1w">
        Étape {currentStep} sur {totalSteps}
      </p>
      <div className="fr-progress" role="progressbar" aria-valuenow={progression} aria-valuemin={0} aria-valuemax={100}>
        <div className="fr-progress__bar" style={{ width: `${progression}%` }} />
      </div>
    </div>
  );
}
