"use client";

import Link from "next/link";

interface StepIntroProps {
  onStart: () => void;
}

/**
 * Page d'introduction du simulateur
 */
export function StepIntro({ onStart }: StepIntroProps) {
  return (
    <div className="fr-container fr-mb-8w">
      <div className="fr-grid-row fr-grid-row--center">
        <div className="fr-col-12 fr-col-md-8 fr-col-lg-8 p-10 bg-[var(--background-alt-grey)]">
          <div className="flex justify-end fr-mb-2w">
            <Link
              id="link-help"
              href="mailto:contact@fonds-prevention-argile.fr?subject=Besoin%20d'aide%20pour%20le%20simulateur%20d'éligibilité%20au%20Fonds%20Prévention%20Argile"
              target="_self"
              className="fr-link fr-icon-question-fill fr-link--icon-left">
              Besoin d'aide ?
            </Link>
          </div>
          <div className="px-8 fr-mt-6w">
            <h5 className="fr-mb-4w">Simulateur d'éligibilité au Fonds Prévention Argile</h5>

            <div className="fr-callout fr-icon-warning-line fr-callout--pink-macaron">
              <p>
                Attention, si votre logement est déjà touché par{" "}
                <strong>des fissures de plus de 1mm d'épaisseur à l'extérieur et/ou à l'intérieur</strong>, votre
                logement n'est <strong>pas éligible</strong>.
              </p>
            </div>

            <p className="fr-mb-3w">
              En quelques étapes, découvrez si votre logement et votre situation correspondent aux critères
              d'éligibilité définis par l'État pour bénéficier des aides financières{" "}
              <Link
                href="https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000050310058"
                target="_blank"
                rel="noopener noreferrer">
                (arrêté du 6 septembre 2025)
              </Link>
              .
            </p>

            <p className="fr-text--bold fr-mb-4w">
              Si vous êtes éligible, nous vous transmettrons les coordonnées d'Assistants à Maîtrise d'Ouvrage locaux et
              certifiés à contacter pour continuer vos démarches.
            </p>

            <div className="flex justify-end">
              <button type="button" className="fr-btn" onClick={onStart}>
                Démarrer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
