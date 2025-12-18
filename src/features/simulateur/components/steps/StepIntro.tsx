"use client";

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
        <div className="fr-col-12 fr-col-md-8 fr-col-lg-8 p-20 bg-[var(--background-alt-grey)]">
          <h5 className="fr-h5 fr-mb-4w">Simulateur d'éligibilité au Fonds Prévention Argile</h5>

          <div className="fr-callout fr-icon-warning-line fr-callout--pink-macaron">
            <p>
              Attention, si votre logement est déjà touché par{" "}
              <strong>des fissures de plus de 1mm d'épaisseur à l'extérieur et/ou à l'intérieur</strong>, votre logement
              n'est <strong>pas éligible</strong>.
            </p>
          </div>

          <p className="fr-mb-3w">
            En quelques étapes, découvrez si votre logement et votre situation correspondent aux critères d'éligibilité
            définis par l'État pour bénéficier des aides financières{" "}
            <a
              href="https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000050310058"
              target="_blank"
              rel="noopener noreferrer">
              (arrêté du 6 septembre 2025)
            </a>
            .
          </p>

          <p className="fr-text--bold fr-mb-4w">
            Si vous êtes éligible, nous vous transmettrons les coordonnées d'Assistants à Maîtrise d'Ouvrage locaux et
            certifiés à contacter pour continuer vos démarches.
          </p>

          <div className="fr-btns-group fr-btns-group--right">
            <button type="button" className="fr-btn" onClick={onStart}>
              Démarrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
