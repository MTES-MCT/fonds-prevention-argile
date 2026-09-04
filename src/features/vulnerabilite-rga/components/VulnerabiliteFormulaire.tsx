"use client";

import { useEffect } from "react";
import { useVulnerabiliteFormulaire } from "../hooks/useVulnerabiliteFormulaire";
import { VulnerabiliteStep } from "../domain/value-objects/vulnerabilite-step.enum";
import {
  StepIntro,
  StepAdresseVulnerabilite,
  StepPenteTerrain,
  StepReseauxEnterres,
  StepGravierProprete,
  StepGouttieres,
  StepArbreProximite,
  StepArbreEssence,
  StepHaies,
  StepVegetationPiedFacade,
  StepMitoyenneteVulnerabilite,
  StepEnsoleillement,
} from "./steps";
import { ResultVulnerabilite } from "./results";

/**
 * Composant orchestrateur du simulateur de vulnérabilité RGA — même rôle que
 * `SimulateurFormulaire` (switch sur l'étape courante), en plus simple : pas de
 * FranceConnect, pas d'early-exit, le résultat est calculé localement (pas d'appel
 * serveur), donc pas besoin de commit vers un store partagé.
 */
export function VulnerabiliteFormulaire() {
  const {
    isLoading,
    currentStep,
    answers,
    result,
    numeroEtape,
    totalEtapes,
    canGoBack,
    start,
    submitAnswer,
    goBack,
    reset,
  } = useVulnerabiliteFormulaire();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [currentStep]);

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

  const stepProps = {
    numeroEtape: numeroEtape ?? 0,
    totalEtapes,
    canGoBack,
    onSubmit: submitAnswer,
    onBack: goBack,
  };

  switch (currentStep) {
    case VulnerabiliteStep.INTRO:
      return <StepIntro onStart={start} />;

    case VulnerabiliteStep.ADRESSE:
      return <StepAdresseVulnerabilite {...stepProps} initialValue={answers.adresse} />;

    case VulnerabiliteStep.PENTE_TERRAIN:
      return <StepPenteTerrain {...stepProps} initialValue={answers.eaux?.pente_terrain} />;

    case VulnerabiliteStep.RESEAUX_ENTERRES:
      return <StepReseauxEnterres {...stepProps} initialValue={answers.eaux?.reseaux_enterres} />;

    case VulnerabiliteStep.GRAVIER_PROPRETE:
      return <StepGravierProprete {...stepProps} initialValue={answers.eaux?.gravier_proprete} />;

    case VulnerabiliteStep.GOUTTIERES:
      return <StepGouttieres {...stepProps} initialValue={answers.eaux?.gouttieres} />;

    case VulnerabiliteStep.ARBRE_PROXIMITE:
      return <StepArbreProximite {...stepProps} initialValue={answers.vegetation?.arbre_proximite} />;

    case VulnerabiliteStep.ARBRE_ESSENCE:
      return <StepArbreEssence {...stepProps} initialValue={answers.vegetation?.arbre_essence} />;

    case VulnerabiliteStep.HAIES:
      return <StepHaies {...stepProps} initialValue={answers.vegetation?.haies} />;

    case VulnerabiliteStep.VEGETATION_PIED_FACADE:
      return <StepVegetationPiedFacade {...stepProps} initialValue={answers.vegetation?.vegetation_pied_facade} />;

    case VulnerabiliteStep.MITOYENNETE:
      return <StepMitoyenneteVulnerabilite {...stepProps} initialValue={answers.divers?.mitoyennete} />;

    case VulnerabiliteStep.ENSOLEILLEMENT:
      return <StepEnsoleillement {...stepProps} initialValue={answers.divers?.ensoleillement} />;

    case VulnerabiliteStep.RESULTAT:
      if (!result) {
        console.error("[VulnerabiliteFormulaire] État incohérent à l'étape RESULTAT : résultat manquant");
        return (
          <div className="fr-container fr-py-4w">
            <p>Une erreur est survenue. Veuillez recommencer.</p>
            <button className="fr-btn" onClick={reset}>
              Recommencer
            </button>
          </div>
        );
      }
      return <ResultVulnerabilite result={result} onRestart={reset} />;

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
