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
              <h5 className="fr-mb-4w">Simulateur de vulnérabilité RGA</h5>

              <p className="fr-mb-3w">
                Le retrait-gonflement des argiles (RGA) fragilise les maisons individuelles quand le sol argileux se
                rétracte en période sèche puis regonfle avec l&apos;humidité. En quelques questions très simples,
                estimez le niveau de vulnérabilité de votre logement et découvrez les gestes simples pour le réduire.
              </p>

              <p className="fr-mb-2w fr-text--bold">Trois sources de vulnérabilité :</p>
              <ul className="fr-mb-3w">
                <li>
                  <strong>Le sol</strong> : l&apos;aléa argileux de votre terrain — on ne peut pas agir dessus, les
                  solutions ne sont pas encore éprouvées.
                </li>
                <li>
                  <strong>Le bâtiment</strong> : notamment les fondations — des travaux efficaces mais coûteux, à
                  réserver à un diagnostic d&apos;expert.
                </li>
                <li>
                  <strong>L&apos;environnement proche</strong> : gestion de l&apos;eau et de la végétation autour de la
                  maison — c&apos;est là que des gestes simples, à moindre coût, ont le plus d&apos;impact. C&apos;est
                  le cœur de ce simulateur.
                </li>
              </ul>

              <p className="fr-mb-3w fr-text--sm" style={{ color: "var(--text-mention-grey)" }}>
                Environ 5 minutes, aucune inscription nécessaire.
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
