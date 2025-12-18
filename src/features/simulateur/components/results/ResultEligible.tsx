"use client";

import Link from "next/link";
import type { EligibilityChecks } from "../../domain/entities/eligibility-result.entity";
import { EligibilityChecksList } from "./EligibilityChecksList";

interface ResultEligibleProps {
  checks: EligibilityChecks;
  onContinue: () => void;
  onRestart: () => void;
}

/**
 * Page de résultat : éligible
 */
export function ResultEligible({ checks, onContinue, onRestart }: ResultEligibleProps) {
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

              <div className="fr-alert fr-alert--success fr-mb-4w">
                <h2 className="fr-alert__title">Bonne nouvelle !</h2>
                <p>
                  Votre logement semble éligible au Fonds Prévention Argile. Vous pouvez maintenant créer votre compte
                  pour déposer votre demande.
                </p>
              </div>

              <EligibilityChecksList checks={checks} />

              <div className="fr-mt-4w">
                <h3 className="fr-h5">Et maintenant ?</h3>
                <p>
                  Pour déposer votre demande d'aide, vous devez vous connecter avec FranceConnect. Vos données de
                  simulation seront conservées.
                </p>
              </div>

              <div className="fr-mt-4w flex flex-col-reverse md:flex-row md:justify-end gap-2">
                <button
                  type="button"
                  className="fr-btn fr-btn--tertiary !w-full md:!w-auto justify-center"
                  onClick={onRestart}>
                  Recommencer la simulation
                </button>
                <button type="button" className="fr-btn !w-full md:!w-auto justify-center" onClick={onContinue}>
                  Continuer avec FranceConnect
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
