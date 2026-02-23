"use client";

import { ReactNode } from "react";
import { ProgressBar } from "./ProgressBar";
import { useSimulateurContext } from "./SimulateurContext";

interface SimulateurLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  description?: string;
  currentStep: number | null;
  totalSteps: number;
  showProgress?: boolean;
  /** Titre principal du simulateur (par défaut: "Simulateur d'éligibilité au Fonds Prévention Argile") */
  formTitle?: string;
  /** Afficher le lien "Besoin d'aide ?" (par défaut: true) */
  showHelpLink?: boolean;
}

const DEFAULT_FORM_TITLE = "Simulateur d\u2019\u00e9ligibilit\u00e9 au Fonds Pr\u00e9vention Argile";

/**
 * Layout commun pour toutes les étapes du simulateur.
 * Les props formTitle/showHelpLink peuvent être fournies directement ou via SimulateurProvider (contexte).
 */
export function SimulateurLayout({
  children,
  title,
  subtitle,
  description,
  currentStep,
  totalSteps,
  showProgress = true,
  formTitle: formTitleProp,
  showHelpLink: showHelpLinkProp,
}: SimulateurLayoutProps) {
  const context = useSimulateurContext();

  // Les props directes ont la priorité sur le contexte
  const formTitle = formTitleProp ?? context.formTitle ?? DEFAULT_FORM_TITLE;
  const showHelpLink = showHelpLinkProp ?? context.showHelpLink ?? true;

  const hasSubContent = subtitle || description;
  const titleMargin = hasSubContent ? "fr-mb-1v" : "fr-mb-4w";

  return (
    <div className="bg-[var(--background-alt-grey)] md:bg-transparent">
      <div className="fr-container fr-mb-8w">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-8 md:bg-[var(--background-alt-grey)] p-0 md:p-10">
            {showHelpLink && (
              <div className="flex justify-end fr-mb-2w px-4 pt-4 md:px-0 md:pt-0">
                <a
                  id="link-help"
                  href="mailto:contact@fonds-prevention-argile.fr?subject=Besoin%20d'aide%20pour%20le%20simulateur%20d'éligibilité%20au%20Fonds%20Prévention%20Argile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fr-link fr-icon-question-fill fr-link--icon-left">
                  Besoin d&apos;aide ?
                </a>
              </div>
            )}
            <div className="px-4 md:px-8 pb-4 md:pb-0 fr-mt-4w md:fr-mt-6w">
              <h5 className="fr-mb-4w">{formTitle}</h5>
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
