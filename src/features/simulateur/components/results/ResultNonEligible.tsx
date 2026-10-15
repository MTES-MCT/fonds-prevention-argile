"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/client";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { VULNERABILITE_RGA_URL } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-routes";
import { isVulnerabiliteRgaActive } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite";
import { useMatomo } from "@/shared/components/Matomo/useMatomo";
import { MATOMO_EVENTS } from "@/shared/constants";
import { peutProposerVulnerabilite } from "../../domain/services/proposition-vulnerabilite.service";
import { useSimulateurContext } from "../shared/SimulateurContext";
import type { EligibilityChecks } from "../../domain/entities/eligibility-result.entity";
import { EligibilityChecksList } from "./EligibilityChecksList";
import { LienAideResultat } from "./LienAideResultat";

interface ResultNonEligibleProps {
  checks: EligibilityChecks;
  onRestart: () => void;
  onBack: () => void;
}

/**
 * Page de résultat : non éligible
 */
export function ResultNonEligible({ checks, onRestart, onBack }: ResultNonEligibleProps) {
  const { isAuthenticated } = useAuth();
  const { trackEvent } = useMatomo();
  const { proposerVulnerabilite = true } = useSimulateurContext();
  const proposeVulnerabilite = proposerVulnerabilite && isVulnerabiliteRgaActive() && peutProposerVulnerabilite(checks);

  return (
    <div className="bg-[var(--background-alt-grey)] min-h-screen md:min-h-0 md:bg-transparent">
      <div className="fr-container fr-mb-8w">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-8 md:bg-[var(--background-alt-grey)] p-0 md:p-10">
            <LienAideResultat />
            <div className="px-4 md:px-8 pb-4 md:pb-0 fr-mt-4w md:fr-mt-6w">
              <h5 className="fr-mb-4w">Simulateur d'éligibilité au Fonds Prévention Argile</h5>

              <div className="fr-callout fr-icon-warning-line fr-callout--pink-macaron">
                {proposeVulnerabilite ? (
                  <>
                    <h2 className="fr-callout__title">Vous n&apos;êtes pas éligible, mais vous pouvez agir.</h2>
                    <p>
                      Votre logement ne remplit pas les critères du Fonds Prévention Argile. Cela ne vous empêche pas
                      d&apos;agir : le simulateur de vulnérabilité identifie les points faibles de votre logement et
                      vous donne des pistes pour réduire les risques liés au retrait-gonflement des argiles.
                    </p>
                    <Link
                      href={VULNERABILITE_RGA_URL}
                      className="fr-btn fr-mt-2w"
                      onClick={() => trackEvent(MATOMO_EVENTS.VULNERABILITE_CTA_NON_ELIGIBLE)}>
                      Tester ma vulnérabilité (5 min)
                    </Link>
                  </>
                ) : (
                  <>
                    <h2 className="fr-callout__title">Vous n&apos;êtes pas éligible</h2>
                    <p>Votre logement ne répond pas aux critères du dispositif.</p>
                  </>
                )}
                {/* Le résultat est déjà enregistré sur le dossier : on évite juste le cul-de-sac. */}
                {isAuthenticated && (
                  <Link href={ROUTES.particulier.monCompte} className="fr-btn fr-btn--secondary fr-mt-2w">
                    Retour à mon espace
                  </Link>
                )}
              </div>

              <EligibilityChecksList checks={checks} isEligible={false} defaultCollapsed={proposeVulnerabilite} />

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
