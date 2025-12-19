"use client";

import Link from "next/link";
import type { EligibilityChecks } from "../../domain/entities/eligibility-result.entity";
import { EligibilityChecksList } from "./EligibilityChecksList";

interface ResultNonEligibleProps {
  checks: EligibilityChecks;
  onRestart: () => void;
  onBack: () => void;
}

/**
 * Page de résultat : non éligible
 */
export function ResultNonEligible({ checks, onRestart, onBack }: ResultNonEligibleProps) {
  return (
    <div className="bg-[var(--background-alt-grey)] min-h-screen md:min-h-0 md:bg-transparent">
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

              <div className="fr-callout fr-icon-warning-line fr-callout--pink-macaron">
                <h2 className="fr-callout__title">Vous n'êtes pas éligible</h2>
                <p>Votre logement ne répond pas aux critères du dispositif.</p>
              </div>

              <EligibilityChecksList checks={checks} isEligible={false} />

              <div className="fr-mt-4w flex flex-col-reverse md:flex-row md:justify-end gap-2">
                <button
                  type="button"
                  className="fr-btn fr-btn--tertiary !w-full md:!w-auto justify-center"
                  onClick={onBack}>
                  Précédent
                </button>
                <button
                  type="button"
                  className="fr-btn fr-btn--secondary fr-icon-arrow-go-back-line fr-btn--icon-left  !w-full md:!w-auto justify-center"
                  onClick={onRestart}>
                  Recommencer la simulation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
