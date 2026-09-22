"use client";

import { ReactNode } from "react";
import { ProgressBar } from "./ProgressBar";

interface VulnerabiliteLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: ReactNode;
  currentStep: number | null;
  totalSteps: number;
  showProgress?: boolean;
}

/**
 * Layout commun aux étapes du simulateur de vulnérabilité. Version simplifiée du
 * `SimulateurLayout` du simulateur d'éligibilité — pas de contexte (pas de mode
 * embarqué dans un wizard parent, pas de mode édition).
 */
export function VulnerabiliteLayout({
  children,
  title,
  subtitle,
  currentStep,
  totalSteps,
  showProgress = true,
}: VulnerabiliteLayoutProps) {
  const hasSubtitle = Boolean(subtitle);
  const titleMargin = hasSubtitle ? "fr-mb-1v" : "fr-mb-4w";

  return (
    <div className="bg-[var(--background-alt-grey)] md:bg-transparent">
      <div className="fr-container fr-mb-8w">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-8 md:bg-[var(--background-alt-grey)] p-0 md:p-10">
            <div className="px-4 md:px-6 pb-4 md:pb-0 fr-mt-3w md:fr-mt-4w">
              {showProgress && <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />}
              {title && <h1 className={`fr-h4 ${titleMargin}`}>{title}</h1>}
              {subtitle && <div className="fr-text--sm fr-mb-2w text-(--text-mention-grey)">{subtitle}</div>}
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
