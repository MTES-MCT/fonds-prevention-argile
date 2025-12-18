"use client";

import { ReactNode } from "react";
import { ProgressBar } from "./ProgressBar";

interface SimulateurLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  currentStep: number | null;
  totalSteps: number;
  showProgress?: boolean;
}

/**
 * Layout commun pour toutes les étapes du simulateur
 */
export function SimulateurLayout({
  children,
  title,
  description,
  currentStep,
  totalSteps,
  showProgress = true,
}: SimulateurLayoutProps) {
  return (
    <div className="fr-container fr-py-4w">
      <div className="fr-grid-row fr-grid-row--center">
        <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
          {showProgress && <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />}

          {title && <h1 className="fr-h3 fr-mb-2w">{title}</h1>}

          {description && <p className="fr-text--lg fr-mb-4w">{description}</p>}

          {children}
        </div>
      </div>
    </div>
  );
}
