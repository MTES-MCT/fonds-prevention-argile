"use client";

import { ReactNode } from "react";
import { ProgressBar } from "./ProgressBar";
import Link from "next/link";

interface SimulateurLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
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
  subtitle,
  description,
  currentStep,
  totalSteps,
  showProgress = true,
}: SimulateurLayoutProps) {
  const hasSubContent = subtitle || description;
  const titleMargin = hasSubContent ? "fr-mb-1v" : "fr-mb-4w";

  return (
    <div className="bg-[var(--background-alt-grey)] md:bg-transparent">
      <div className="fr-container fr-mb-8w">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-8 md:bg-[var(--background-alt-grey)] p-0 md:p-10">
            <div className="flex justify-end fr-mb-2w px-4 pt-4 md:px-0 md:pt-0">
              <Link
                id="link-help"
                href="mailto:contact@fonds-prevention-argile.fr?subject=Besoin%20d'aide%20pour%20le%20simulateur%20d'éligibilité%20au%20Fonds%20Prévention%20Argile"
                target="_self"
                className="fr-link fr-icon-question-fill fr-link--icon-left">
                Besoin d'aide ?
              </Link>
            </div>
            <div className="px-4 md:px-8 pb-4 md:pb-0 fr-mt-4w md:fr-mt-6w">
              <h5 className="fr-mb-4w">Simulateur d'éligibilité au Fonds Prévention Argile</h5>
              {showProgress && <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />}
              {title && <h4 className={titleMargin}>{title}</h4>}
              {subtitle && <p className="fr-text--sm fr-mb-2w text-gray-500">{subtitle}</p>}
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
