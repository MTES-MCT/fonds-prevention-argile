"use client";

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
    <div className="fr-container fr-py-4w">
      <div className="fr-grid-row fr-grid-row--center">
        <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
          <div className="fr-alert fr-alert--success fr-mb-4w">
            <h2 className="fr-alert__title">Bonne nouvelle !</h2>
            <p>
              Votre logement semble éligible au Fonds Prévention Argile. Vous pouvez maintenant créer votre compte pour
              déposer votre demande.
            </p>
          </div>

          <EligibilityChecksList checks={checks} />

          <div className="fr-mt-4w">
            <h3 className="fr-h5">Et maintenant ?</h3>
            <p>
              Pour déposer votre demande d'aide, vous devez vous connecter avec FranceConnect. Vos données de simulation
              seront conservées.
            </p>
          </div>

          <div className="fr-btns-group fr-btns-group--inline fr-mt-4w">
            <button type="button" className="fr-btn" onClick={onContinue}>
              Continuer avec FranceConnect
            </button>
            <button type="button" className="fr-btn fr-btn--tertiary" onClick={onRestart}>
              Recommencer la simulation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
