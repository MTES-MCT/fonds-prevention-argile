"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  useCreationDossierStore,
  WizardStep,
  TOTAL_STEPS,
  getDisplayedStepNumber,
  type WizardIntent,
} from "../stores/creation-dossier.store";
import { StepChoixMode } from "./steps/StepChoixMode";
import { StepIdentite } from "./steps/StepIdentite";
import { StepContact } from "./steps/StepContact";
import { StepEnvoiEmail } from "./steps/StepEnvoiEmail";

interface CreationDossierWizardProps {
  /**
   * Intent du wizard, lu côté serveur depuis `?intent=av|amo` et propagé ici.
   * Posé dans le store au mount pour piloter le claim AMO et le redirect final.
   */
  intent: WizardIntent;
}

/**
 * Titre affiché dans le stepper sous "Étape X sur N".
 * Reste vide tant que le mode n'a pas été choisi (étape 1).
 */
function getStepperTitle(wantsSimulation: boolean | null): string | null {
  if (wantsSimulation === null) return null;
  return wantsSimulation
    ? "Faire une simulation d’éligibilité puis créer le dossier"
    : "Création de dossier sans simulation d’éligibilité";
}

export function CreationDossierWizard({ intent }: CreationDossierWizardProps) {
  const currentStep = useCreationDossierStore((s) => s.currentStep);
  const wantsSimulation = useCreationDossierStore((s) => s.wantsSimulation);
  const setIntent = useCreationDossierStore((s) => s.setIntent);
  const totalSteps = TOTAL_STEPS;
  const displayedStep = getDisplayedStepNumber(currentStep, wantsSimulation);
  const stepperTitle = getStepperTitle(wantsSimulation);

  // Synchronise l'intent du store avec celui passé en prop (issu du param URL).
  // Important : utilise un useEffect, pas un set dans le render — sinon les
  // sélecteurs Zustand provoquent une boucle.
  useEffect(() => {
    setIntent(intent);
  }, [intent, setIntent]);

  return (
    <>
      {/* Header sur fond blanc : breadcrumb + titre + sous-titre */}
      <div className="fr-container fr-py-4w">
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
        <p className="fr-text--md fr-mb-0 text-gray-500">
          Ce dossier pourra être rattaché à un demandeur (France Connect)
        </p>
      </div>

      {/* Zone wizard sur fond bleu DSFR */}
      <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          <div className="fr-grid-row fr-grid-row--center">
            <div className="fr-col-12 fr-col-md-10 fr-col-lg-8">
              {/* Carte blanche centrée */}
              <div className="bg-white fr-p-6w">
                <div className="fr-stepper">
                  {stepperTitle ? (
                    <h2 className="fr-stepper__title">
                      {stepperTitle}
                      <span className="fr-stepper__state">
                        Étape {displayedStep} sur {totalSteps}
                      </span>
                    </h2>
                  ) : (
                    <p className="fr-stepper__state fr-mb-2w">
                      Étape {displayedStep} sur {totalSteps}
                    </p>
                  )}
                  <div
                    className="fr-stepper__steps"
                    data-fr-current-step={displayedStep}
                    data-fr-steps={totalSteps}></div>
                </div>

                <div className="fr-mt-4w">
                  {currentStep === WizardStep.CHOIX_MODE && <StepChoixMode />}
                  {currentStep === WizardStep.IDENTITE && <StepIdentite />}
                  {currentStep === WizardStep.CONTACT && <StepContact />}
                  {currentStep === WizardStep.ENVOI_EMAIL && <StepEnvoiEmail />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
