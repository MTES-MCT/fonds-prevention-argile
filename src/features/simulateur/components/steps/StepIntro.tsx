"use client";

interface StepIntroProps {
  onStart: () => void;
}

/**
 * Page d'introduction du simulateur
 */
export function StepIntro({ onStart }: StepIntroProps) {
  return (
    <div className="fr-container fr-py-4w">
      <div className="fr-grid-row fr-grid-row--center">
        <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
          <h1 className="fr-h2 fr-mb-2w">Testez votre éligibilité</h1>

          <p className="fr-text--lg fr-mb-4w">
            Vérifiez en quelques minutes si vous pouvez bénéficier du Fonds Prévention Argile pour protéger votre maison
            contre le retrait-gonflement des argiles.
          </p>

          <div className="fr-callout fr-mb-4w">
            <h2 className="fr-callout__title">Ce dont vous aurez besoin</h2>
            <ul className="fr-mt-2w">
              <li>L'adresse de votre logement</li>
              <li>L'année de construction de votre maison</li>
              <li>Votre revenu fiscal de référence</li>
            </ul>
          </div>

          <div className="fr-callout fr-callout--blue-ecume fr-mb-4w">
            <p className="fr-callout__text">
              Cette simulation est gratuite et ne vous engage à rien. Elle prend environ 3 minutes.
            </p>
          </div>

          <button type="button" className="fr-btn fr-btn--lg" onClick={onStart}>
            Commencer le test
          </button>
        </div>
      </div>
    </div>
  );
}
