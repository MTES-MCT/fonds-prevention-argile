import { contentAccountPage } from "@/content";
import StepDetailEligibilite from "../steps/eligibilite/StepDetailEligibilite";
import StepDetailDiagnostic from "../steps/diagnostic/StepDetailDiagnostic";
import StepDetailFactures from "../steps/factures/StepDetailFactures";
import StepDetailDevis from "../steps/devis/StepDetailDevis";
import StepDetailAmo from "../steps/amo/StepDetailAmo";

export default function StepDetailSection() {
  return (
    <section className="fr-container-fluid fr-py-10w bg-[var(--background-alt-blue-france)]">
      <div className="fr-container">
        {/* Zone texte */}
        <h2 className="text-left">{contentAccountPage.steps_section.title}</h2>

        {/* Zone cartes étapes détaillées */}
        <div className="fr-grid-row fr-grid-row--gutters">
          <div className="fr-col-12 fr-col-md-3">
            <StepDetailAmo />
          </div>
          <div className="fr-col-12 fr-col-md-3">
            <StepDetailEligibilite />
          </div>
          <div className="fr-col-12 fr-col-md-3">
            <StepDetailDiagnostic />
          </div>
          <div className="fr-col-12 fr-col-md-3">
            <StepDetailDevis />
          </div>
          <div className="fr-col-12 fr-col-md-3">
            <StepDetailFactures />
          </div>
        </div>
      </div>
    </section>
  );
}
