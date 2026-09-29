"use client";

import { ReactNode } from "react";
import { LIEN_AIDE_SIMULATEUR } from "@/shared/constants/aide.constants";
import { useSimulateurContext } from "./SimulateurContext";
import { BarreCollanteContext } from "./NavigationButtons";

interface SimulateurLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: ReactNode;
  currentStep: number | null;
  totalSteps: number;
  showProgress?: boolean;
  /** Titre au-dessus du compteur, réservé aux écrans d'édition (ex : nom du demandeur) */
  formTitle?: string;
  /** Afficher le lien "Besoin d'aide ?" (par défaut : non, le header du tunnel le porte) */
  showHelpLink?: boolean;
}

/**
 * Layout commun des étapes : compteur et question en tête, boutons collés au bas de l'écran
 * quand ils en sortiraient.
 * Les props formTitle/showHelpLink peuvent être fournies directement ou via SimulateurProvider (contexte).
 */
export function SimulateurLayout({
  children,
  title,
  subtitle,
  currentStep,
  totalSteps,
  showProgress = true,
  formTitle: formTitleProp,
  showHelpLink: showHelpLinkProp,
}: SimulateurLayoutProps) {
  const context = useSimulateurContext();

  const formTitle = formTitleProp ?? context.formTitle;
  const showHelpLink = showHelpLinkProp ?? context.showHelpLink ?? false;

  const titleMargin = subtitle ? "fr-mb-1v" : "fr-mb-4w";

  // Mode embarqué : le parent (ex: wizard invitation AMO AV) fournit son propre layout.
  // On rend uniquement le contenu de l'étape sans wrapping externe.
  if (context.embedded) {
    return (
      <>
        {title && <h4 className={titleMargin}>{title}</h4>}
        {subtitle && <div className="fr-text--sm fr-mb-2w text-(--text-mention-grey)">{subtitle}</div>}
        {children}
      </>
    );
  }

  // Un seul h1 par page : les écrans d'édition portent déjà le leur.
  const TitreQuestion = formTitle ? "h2" : "h1";

  return (
    // Sans marge latérale sur mobile : la page fournit déjà son conteneur, la carte grise a son propre retrait.
    <div className="fr-container max-md:px-0! fr-mb-8w">
      <div className="fr-grid-row fr-grid-row--center">
        <div className="fr-col-12 fr-col-md-10 fr-col-lg-8">
          {showHelpLink && (
            <div className="flex justify-end fr-mt-2w fr-mb-2w">
              <a
                id="link-help"
                href={LIEN_AIDE_SIMULATEUR}
                target="_blank"
                rel="noopener noreferrer"
                className="fr-link fr-icon-question-fill fr-link--icon-left">
                Besoin d&apos;aide ?
              </a>
            </div>
          )}
          {/* Avant les boutons, la marge du groupe de choix doublerait celle de sa dernière option. */}
          <div className="bg-(--background-alt-grey) px-4 pt-6 pb-2 md:px-10 md:pt-10 md:pb-6 [&_.fr-fieldset:has(+.barre-navigation)]:mb-0!">
            {formTitle && <p className="fr-h6 fr-mb-2w">{formTitle}</p>}
            {showProgress && currentStep !== null && (
              <p className="fr-text--sm fr-mb-1v">
                Simulation d&apos;éligibilité - {currentStep}/{totalSteps}
              </p>
            )}
            {title && <TitreQuestion className={`fr-h4 ${titleMargin}`}>{title}</TitreQuestion>}
            {subtitle && <div className="fr-text--sm fr-mb-3w text-(--text-mention-grey)">{subtitle}</div>}
            <BarreCollanteContext.Provider value={true}>{children}</BarreCollanteContext.Provider>
          </div>
        </div>
      </div>
    </div>
  );
}
