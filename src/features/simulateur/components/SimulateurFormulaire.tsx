"use client";

import { useEffect, useRef } from "react";
import { useSimulateurFormulaire } from "../hooks/useSimulateurFormulaire";
import { SimulateurStep } from "../domain/value-objects/simulateur-step.enum";
import { useMatomo } from "@/shared/components/Matomo/useMatomo";
import { encryptRGAData } from "../actions/encrypt-rga-data.actions";

// Steps
import {
  StepIntro,
  StepTypeLogement,
  StepAdresse,
  StepEtatMaison,
  StepMitoyennete,
  StepIndemnisation,
  StepAssurance,
  StepProprietaire,
  StepRevenus,
} from "./steps";

// Results
import { ResultEligible, ResultNonEligible } from "./results";
import { MATOMO_EVENTS } from "@/shared/constants";
import { SIMULATEUR_STEP_EVENTS } from "../domain";

/**
 * Composant orchestrateur du simulateur d'éligibilité
 */
export function SimulateurFormulaire() {
  const {
    isLoading,
    currentStep,
    answers,
    checks,
    numeroEtape,
    totalEtapes,
    canGoBack,
    isEligible,
    start,
    submitAnswer,
    goBack,
    reset,
    commitToRGAStore,
  } = useSimulateurFormulaire();

  const { trackEvent } = useMatomo();
  const previousStepRef = useRef<SimulateurStep | null>(null);

  // Scroll to top à chaque changement d'étape
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [currentStep]);

  // Tracking Matomo à chaque changement d'étape
  useEffect(() => {
    // Éviter le double tracking au premier render
    if (previousStepRef.current === currentStep) return;
    previousStepRef.current = currentStep;

    // Tracker selon l'étape
    if (currentStep === SimulateurStep.RESULTAT) {
      // Tracker le résultat
      if (isEligible) {
        trackEvent(MATOMO_EVENTS.SIMULATEUR_RESULT_ELIGIBLE);
      } else {
        trackEvent(MATOMO_EVENTS.SIMULATEUR_RESULT_NON_ELIGIBLE);
      }
    } else if (currentStep !== SimulateurStep.INTRO) {
      const eventName = SIMULATEUR_STEP_EVENTS[currentStep];
      if (eventName) {
        trackEvent(eventName);
      }
    }
  }, [currentStep, isEligible, trackEvent]);

  // Wrapper pour start avec tracking
  const handleStart = () => {
    trackEvent(MATOMO_EVENTS.SIMULATEUR_START);
    start();
  };

  // Loading state (hydratation SSR)
  if (isLoading) {
    return (
      <div className="fr-container fr-py-4w">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
            <p>Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  // Props communes pour les étapes
  const stepProps = {
    numeroEtape: numeroEtape ?? 0,
    totalEtapes,
    canGoBack,
    onSubmit: submitAnswer,
    onBack: goBack,
  };

  // Gestion de la connexion FranceConnect
  const handleContinueToFC = async () => {
    commitToRGAStore();

    // Si on est dans une iframe, ouvrir dans une nouvelle fenêtre
    // Sinon, naviguer normalement
    const isInIframe = window !== window.parent;

    if (isInIframe) {
      // En mode iframe, chiffrer les données et les transmettre via URL hash
      try {
        const result = await encryptRGAData(answers);

        if (result.success) {
          window.open(`/connexion?redirect=/parcours#d=${result.encrypted}`, "_blank");
        } else {
          console.error("[SimulateurFormulaire] Erreur chiffrement:", result.error);
          // Fallback : ouvrir sans données (l'utilisateur devra refaire la simulation)
          window.open("/connexion?redirect=/parcours", "_blank");
        }
      } catch (error) {
        console.error("[SimulateurFormulaire] Server action encryptRGAData échouée (possible redéploiement):", error);
        // Fallback : ouvrir sans données chiffrées
        window.open("/connexion?redirect=/parcours", "_blank");
      }
    } else {
      window.location.href = "/connexion?redirect=/parcours";
    }
  };

  // Switch sur l'étape courante
  switch (currentStep) {
    case SimulateurStep.INTRO:
      return <StepIntro onStart={handleStart} />;

    case SimulateurStep.TYPE_LOGEMENT:
      return <StepTypeLogement {...stepProps} initialValue={answers.logement?.type} />;

    case SimulateurStep.ADRESSE:
      return (
        <StepAdresse
          {...stepProps}
          initialValue={{
            adresse: answers.logement?.adresse,
            commune: answers.logement?.commune,
            commune_nom: answers.logement?.commune_nom,
            code_departement: answers.logement?.code_departement,
            code_region: answers.logement?.code_region,
            coordonnees: answers.logement?.coordonnees,
            clef_ban: answers.logement?.clef_ban,
            epci: answers.logement?.epci,
            zone_dexposition: answers.logement?.zone_dexposition,
            annee_de_construction: answers.logement?.annee_de_construction,
            niveaux: answers.logement?.niveaux,
            rnb: answers.logement?.rnb,
          }}
        />
      );

    case SimulateurStep.ETAT_MAISON:
      return <StepEtatMaison {...stepProps} initialValue={answers.rga?.sinistres} />;

    case SimulateurStep.MITOYENNETE:
      return <StepMitoyennete {...stepProps} initialValue={answers.logement?.mitoyen} />;

    case SimulateurStep.INDEMNISATION:
      return (
        <StepIndemnisation
          {...stepProps}
          initialValue={{
            dejaIndemnise: answers.rga?.indemnise_indemnise_rga,
            avantJuillet2025: answers.rga?.indemnise_avant_juillet_2025,
            avantJuillet2015: answers.rga?.indemnise_avant_juillet_2015,
            montant: answers.rga?.indemnise_montant_indemnite,
          }}
        />
      );

    case SimulateurStep.ASSURANCE:
      return <StepAssurance {...stepProps} initialValue={answers.rga?.assure} />;

    case SimulateurStep.PROPRIETAIRE:
      return <StepProprietaire {...stepProps} initialValue={answers.logement?.proprietaire_occupant} />;

    case SimulateurStep.REVENUS:
      return (
        <StepRevenus
          {...stepProps}
          initialValue={{
            nombrePersonnes: answers.menage?.personnes,
            revenuFiscalReference: answers.menage?.revenu_rga,
          }}
        />
      );

    case SimulateurStep.RESULTAT:
      if (isEligible && checks) {
        return <ResultEligible checks={checks} onContinue={handleContinueToFC} onRestart={reset} onBack={goBack} />;
      }

      if (!isEligible && checks) {
        return <ResultNonEligible checks={checks} onRestart={reset} onBack={goBack} />;
      }

      console.error("[SimulateurFormulaire] État incohérent à l'étape RESULTAT", {
        isEligible,
        checks,
        answers,
        hasResult: !!useSimulateurFormulaire,
      });

      return (
        <div className="fr-container fr-py-4w">
          <p>Une erreur est survenue. Veuillez recommencer.</p>
          <button className="fr-btn" onClick={reset}>
            Recommencer
          </button>
        </div>
      );

    default:
      return (
        <div className="fr-container fr-py-4w">
          <p>Étape inconnue. Veuillez recommencer.</p>
          <button className="fr-btn" onClick={reset}>
            Recommencer
          </button>
        </div>
      );
  }
}
