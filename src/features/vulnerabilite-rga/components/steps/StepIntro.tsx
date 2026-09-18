"use client";

interface StepIntroProps {
  onStart: () => void;
}

/**
 * Page d'introduction du simulateur de vulnérabilité RGA.
 */
export function StepIntro({ onStart }: StepIntroProps) {
  return (
    <div className="bg-[var(--background-alt-grey)] md:bg-transparent">
      <div className="fr-container fr-mb-8w">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-8 md:bg-[var(--background-alt-grey)] p-0 md:p-10">
            <div className="px-4 md:px-8 pb-4 md:pb-0 fr-mt-4w md:fr-mt-6w">
              <h1 className="fr-h3 fr-mb-1w">Découvrez la vulnérabilité de votre logement</h1>

              <p className="fr-mb-3w fr-text--sm" style={{ color: "var(--text-mention-grey)" }}>
                Environ 2 minutes - Aucune inscription
              </p>

              <p className="fr-mb-3w">
                En quelques questions très simples, estimez le niveau de vulnérabilité de votre logement face au
                retrait-gonflement des argiles et découvrez les gestes pour le réduire.
              </p>

              <div className="flex flex-col md:flex-row md:justify-end">
                <button type="button" className="fr-btn !w-full md:!w-auto justify-center" onClick={onStart}>
                  Démarrer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
