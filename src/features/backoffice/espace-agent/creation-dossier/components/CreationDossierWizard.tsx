"use client";

import Link from "next/link";
import { SimulateurLayout } from "@/features/simulateur/components/shared/SimulateurLayout";
import { SimulateurProvider } from "@/features/simulateur/components/shared/SimulateurContext";
import { useCreationDossierStore, WizardStep, TOTAL_STEPS } from "../stores/creation-dossier.store";
import { StepChoixMode } from "./steps/StepChoixMode";
import { StepCoordonnees } from "./steps/StepCoordonnees";
import { StepEnvoiEmail } from "./steps/StepEnvoiEmail";

const FORM_TITLE = "Ajout d\u2019un nouveau dossier";

function getSubtitle(step: WizardStep, wantsSimulation: boolean | null): string {
  if (step === WizardStep.CHOIX_MODE) return "Ce dossier pourra être rattaché à un demandeur (France Connect)";
  if (wantsSimulation) return "Faire une simulation d\u2019éligibilité puis créer le dossier";
  return "Création de dossier sans simulation d\u2019éligibilité";
}

export function CreationDossierWizard() {
  const currentStep = useCreationDossierStore((s) => s.currentStep);
  const wantsSimulation = useCreationDossierStore((s) => s.wantsSimulation);

  return (
    <SimulateurProvider formTitle={FORM_TITLE} showHelpLink={false}>
      <nav role="navigation" className="fr-breadcrumb" aria-label="vous êtes ici :">
        <button className="fr-breadcrumb__button" aria-expanded="false" aria-controls="breadcrumb-wizard-av">
          Voir le fil d&apos;Ariane
        </button>
        <div className="fr-collapse" id="breadcrumb-wizard-av">
          <ol className="fr-breadcrumb__list">
            <li>
              <Link className="fr-breadcrumb__link" href="/espace-agent/dossiers">
                Accueil
              </Link>
            </li>
            <li>
              <span className="fr-breadcrumb__link" aria-current="page">
                Ajout d&apos;un nouveau dossier
              </span>
            </li>
          </ol>
        </div>
      </nav>

      <h1 className="fr-mb-1v">Ajout d&apos;un nouveau dossier</h1>
      <p className="fr-text--sm fr-mb-4w text-gray-500">
        Ce dossier pourra être rattaché à un demandeur (France Connect)
      </p>

      <SimulateurLayout
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        subtitle={getSubtitle(currentStep, wantsSimulation)}
        showHelpLink={false}>
        {currentStep === WizardStep.CHOIX_MODE && <StepChoixMode />}
        {currentStep === WizardStep.COORDONNEES && <StepCoordonnees />}
        {currentStep === WizardStep.ENVOI_EMAIL && <StepEnvoiEmail />}
      </SimulateurLayout>
    </SimulateurProvider>
  );
}
