"use client";

import { useSimulateurFormulaire } from "../hooks/useSimulateurFormulaire";
import { SimulateurStep } from "../domain/value-objects/simulateur-step.enum";

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
import { useEffect } from "react";

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

  // Scroll to top à chaque changement d'étape
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

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
  const handleContinueToFC = () => {
    commitToRGAStore();
    // TODO: Rediriger vers FranceConnect
    window.location.href = "/connexion?redirect=/parcours";
  };

  // Switch sur l'étape courante
  switch (currentStep) {
    case SimulateurStep.INTRO:
      return <StepIntro onStart={start} />;

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

      // Fallback si état incohérent
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
