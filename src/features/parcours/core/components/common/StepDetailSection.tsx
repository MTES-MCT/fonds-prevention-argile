import StepDetailEligibilite from "../steps/eligibilite/StepDetailEligibilite";
import StepDetailDiagnostic from "../steps/diagnostic/StepDetailDiagnostic";
import StepDetailFactures from "../steps/factures/StepDetailFactures";
import StepDetailDevis from "../steps/devis/StepDetailDevis";
import StepDetailAmo from "../../../amo/components/steps/StepDetailAmo";
import { Step } from "../../domain";
import type { PiecesByStep } from "../../../dossiers-ds/domain/pieces-justificatives";

export default function StepDetailSection({ piecesByStep }: { piecesByStep?: PiecesByStep }) {
  return (
    <section className="fr-container-fluid fr-py-10w bg-[var(--background-alt-blue-france)]">
      <div className="fr-container">
        {/* Zone texte */}
        <h2 className="text-left">Les étapes de votre parcours en détail</h2>

        {/* Zone cartes étapes détaillées */}
        <div className="fr-grid-row fr-grid-row--gutters">
          <div className="fr-col-12 fr-col-md-3">
            <StepDetailAmo />
          </div>
          <div className="fr-col-12 fr-col-md-3">
            <StepDetailEligibilite pieces={piecesByStep?.[Step.ELIGIBILITE]} />
          </div>
          <div className="fr-col-12 fr-col-md-3">
            <StepDetailDiagnostic pieces={piecesByStep?.[Step.DIAGNOSTIC]} />
          </div>
          <div className="fr-col-12 fr-col-md-3">
            <StepDetailDevis pieces={piecesByStep?.[Step.DEVIS]} />
          </div>
          <div className="fr-col-12 fr-col-md-3">
            <StepDetailFactures pieces={piecesByStep?.[Step.FACTURES]} />
          </div>
        </div>
      </div>
    </section>
  );
}
