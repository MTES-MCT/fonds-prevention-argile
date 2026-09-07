"use client";

import { useEffect, useRef } from "react";
import { useVulnerabiliteFormulaire } from "../hooks/useVulnerabiliteFormulaire";
import { VulnerabiliteStep } from "../domain/value-objects/vulnerabilite-step.enum";
import { VULNERABILITE_STEP_EVENTS } from "../domain/value-objects/vulnerabilite-matomo-events";
import { useVulnerabiliteStore } from "../stores/vulnerabilite.store";
import { enregistrerResultatVulnerabiliteAction } from "../actions/enregistrer-resultat.actions";
import { useMatomo } from "@/shared/components/Matomo/useMatomo";
import type { MatomoCustomDimension } from "@/shared/components/Matomo/useMatomo";
import { MATOMO_EVENTS } from "@/shared/constants";
import { getClientEnv } from "@/shared/config/env.config";
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
 * FranceConnect, pas d'early-exit. Le résultat est calculé localement, mais tracké
 * (Matomo) et enregistré de façon anonyme (best-effort) pour les stats d'usage,
 * cf. `/administration/vulnerabilite`.
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

  const { trackEvent } = useMatomo();
  const previousStepRef = useRef<VulnerabiliteStep | null>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [currentStep]);

  // Tracking Matomo à chaque changement d'étape + enregistrement anonyme du résultat.
  // Tant que `isLoading` est vrai, `currentStep` vaut INTRO par défaut (store pas encore
  // réhydraté depuis sessionStorage, cf. useVulnerabiliteFormulaire) — pas fiable, on attend.
  // Au premier rendu réhydraté, on mémorise l'étape réelle SANS la tracker : ça couvre aussi
  // bien une vraie première visite qu'un rechargement de page qui restaure une étape déjà
  // avancée (ex. RESULTAT) — sans ce garde-fou, un F5 sur l'écran de résultat était pris pour
  // une transition et réenregistrait une simulation à chaque rechargement.
  useEffect(() => {
    if (isLoading) return;
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      previousStepRef.current = currentStep;
      return;
    }
    if (previousStepRef.current === currentStep) return;
    previousStepRef.current = currentStep;

    const currentAnswers = useVulnerabiliteStore.getState().vulnerabilite.answers;
    const codeDepartement = currentAnswers.adresse?.codeDepartement;
    const deptDimensionId = getClientEnv().NEXT_PUBLIC_MATOMO_DIMENSION_DEPARTEMENT_ID;

    const dimensions: MatomoCustomDimension[] = [];
    if (codeDepartement && deptDimensionId) {
      dimensions.push({ id: Number(deptDimensionId), value: String(codeDepartement) });
    }
    const customDimensions = dimensions.length > 0 ? dimensions : undefined;

    if (currentStep === VulnerabiliteStep.RESULTAT) {
      trackEvent(MATOMO_EVENTS.VULNERABILITE_RESULT, undefined, customDimensions);

      const currentResult = useVulnerabiliteStore.getState().vulnerabilite.result;
      if (currentResult) {
        // Fire-and-forget : ne doit jamais bloquer ni faire échouer l'affichage du résultat.
        enregistrerResultatVulnerabiliteAction(currentAnswers, currentResult).catch(() => {});
      }
    } else if (currentStep !== VulnerabiliteStep.INTRO) {
      const eventName = VULNERABILITE_STEP_EVENTS[currentStep];
      if (eventName) {
        trackEvent(eventName, undefined, customDimensions);
      }
    }
  }, [isLoading, currentStep, trackEvent]);

  const handleStart = () => {
    trackEvent(MATOMO_EVENTS.VULNERABILITE_START);
    start();
  };

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
      return <StepIntro onStart={handleStart} />;

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
