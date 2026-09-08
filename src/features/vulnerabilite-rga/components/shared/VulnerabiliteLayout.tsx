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

const FORM_TITLE = "Simulateur de vulnérabilité RGA";

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
            <div className="px-4 md:px-8 pb-4 md:pb-0 fr-mt-4w md:fr-mt-6w">
              <h5 className="fr-mb-4w">{FORM_TITLE}</h5>
              {showProgress && <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />}
              {title && <h4 className={titleMargin}>{title}</h4>}
              {subtitle && <div className="fr-text--sm fr-mb-2w text-gray-500">{subtitle}</div>}
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
