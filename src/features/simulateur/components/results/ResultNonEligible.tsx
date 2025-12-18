"use client";

import type { EligibilityChecks } from "../../domain/entities/eligibility-result.entity";
import { EligibilityChecksList } from "./EligibilityChecksList";

interface ResultNonEligibleProps {
  checks: EligibilityChecks;
  reasonMessage: string;
  onRestart: () => void;
}

/**
 * Page de résultat : non éligible
 */
export function ResultNonEligible({ checks, reasonMessage, onRestart }: ResultNonEligibleProps) {
  return (
    <div className="fr-container fr-py-4w">
      <div className="fr-grid-row fr-grid-row--center">
        <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
          <div className="fr-alert fr-alert--error fr-mb-4w">
            <h2 className="fr-alert__title">Vous n'êtes pas éligible</h2>
            <p>{reasonMessage}</p>
          </div>

          <EligibilityChecksList checks={checks} />

          <div className="fr-mt-4w">
            <h3 className="fr-h5">Que faire ?</h3>
            <p>
              Même si vous n'êtes pas éligible au Fonds Prévention Argile, vous pouvez consulter nos ressources pour
              mieux comprendre le phénomène de retrait-gonflement des argiles et protéger votre logement.
            </p>
          </div>

          <div className="fr-btns-group fr-mt-4w">
            <button type="button" className="fr-btn fr-btn--secondary" onClick={onRestart}>
              Recommencer la simulation
            </button>
            <a href="/signes-a-surveiller/fissures-en-escalier" className="fr-btn fr-btn--tertiary">
              En savoir plus sur le RGA
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
