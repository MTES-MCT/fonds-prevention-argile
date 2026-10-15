"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useVulnerabiliteFormulaire } from "../hooks/useVulnerabiliteFormulaire";
import { VulnerabiliteStep } from "../domain/value-objects/vulnerabilite-step.enum";
import { VULNERABILITE_STEP_EVENTS } from "../domain/value-objects/vulnerabilite-matomo-events";
import { useVulnerabiliteStore } from "../stores/vulnerabilite.store";
import { enregistrerResultatVulnerabiliteAction } from "../actions/enregistrer-resultat.actions";
import { toSimulationPayload } from "../domain/value-objects/simulation-payload";
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
  StepRecuperateurEau,
  StepArbreProximite,
  StepHaies,
  StepVegetationPiedFacade,
  StepMitoyenneteVulnerabilite,
  StepEnsoleillement,
} from "./steps";
import { ResultVulnerabilite, ContenuResultatVulnerabilite } from "./results";
import { VulnerabiliteProvider, type ContexteAgentVulnerabilite } from "./shared/VulnerabiliteContext";
import { remplitCriteresEligibiliteFonds } from "../domain/services/eligibilite-fonds.service";
import { Alert } from "@/shared/components";

/**
 * Composant orchestrateur du simulateur de vulnérabilité RGA — même rôle que
 * `SimulateurFormulaire` (switch sur l'étape courante), en plus simple : pas de
 * FranceConnect, pas d'early-exit. Le résultat est calculé localement, mais tracké
 * (Matomo) et enregistré de façon anonyme (best-effort) pour les stats d'usage,
 * cf. `/administration/vulnerabilite`.
 */
export function VulnerabiliteFormulaire({ agent }: { agent?: ContexteAgentVulnerabilite } = {}) {
  return (
    <VulnerabiliteProvider agent={agent}>
      <FormulaireInterne agent={agent} />
    </VulnerabiliteProvider>
  );
}

type EnregistrementAgent = "en_cours" | "ok" | "erreur";

function FormulaireInterne({ agent }: { agent?: ContexteAgentVulnerabilite }) {
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
  const [enregistrementAgent, setEnregistrementAgent] = useState<EnregistrementAgent>("en_cours");

  // Test fait par un agent : le résultat va sur le dossier, jamais dans l'enregistrement anonyme,
  // dont le rattachement par cookie se ferait au navigateur de l'agent.
  const enregistrerPourAgent = useCallback(() => {
    if (!agent) return;
    setEnregistrementAgent("en_cours");
    const payload = toSimulationPayload(useVulnerabiliteStore.getState().vulnerabilite.answers);
    agent
      .enregistrer(payload)
      .then((resultat) => setEnregistrementAgent(resultat.success ? "ok" : "erreur"))
      .catch(() => setEnregistrementAgent("erreur"));
  }, [agent]);

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

    // Ni funnel Matomo ni statistiques publiques : l'agent n'est pas le visiteur du simulateur.
    if (agent) {
      if (currentStep === VulnerabiliteStep.RESULTAT) enregistrerPourAgent();
      return;
    }

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
        // Seuls le département et les réponses sortent du navigateur, jamais l'adresse.
        enregistrerResultatVulnerabiliteAction(toSimulationPayload(currentAnswers)).catch(() => {});
      }
    } else if (currentStep !== VulnerabiliteStep.INTRO) {
      const eventName = VULNERABILITE_STEP_EVENTS[currentStep];
      if (eventName) {
        trackEvent(eventName, undefined, customDimensions);
      }
    }
  }, [isLoading, currentStep, trackEvent, agent, enregistrerPourAgent]);

  const handleStart = () => {
    if (!agent) trackEvent(MATOMO_EVENTS.VULNERABILITE_START);
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

    case VulnerabiliteStep.RECUPERATEUR_EAU:
      return <StepRecuperateurEau {...stepProps} initialValue={answers.eaux?.recuperateur_eau} />;

    case VulnerabiliteStep.ARBRE_PROXIMITE:
      return (
        <StepArbreProximite
          {...stepProps}
          initialValue={answers.vegetation?.arbre_proximite}
          initialEssence={answers.vegetation?.arbre_essence}
        />
      );

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
      if (agent) {
        return (
          <ContenuResultatVulnerabilite
            aleaRga={answers.adresse?.aleaRga}
            points={result.points}
            eligibleFonds={remplitCriteresEligibiliteFonds(answers)}
            entete={
              <EnteteEnregistrementAgent etat={enregistrementAgent} agent={agent} onRetry={enregistrerPourAgent} />
            }
            actions={
              <>
                <button
                  type="button"
                  className="fr-btn fr-btn--secondary !w-full md:!w-auto justify-center"
                  onClick={reset}>
                  Refaire le test
                </button>
                <Link href={agent.urlRetour} className="fr-btn !w-full md:!w-auto justify-center">
                  Retour au dossier
                </Link>
              </>
            }
          />
        );
      }
      return <ResultVulnerabilite answers={answers} result={result} onRestart={reset} />;

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

function EnteteEnregistrementAgent({
  etat,
  agent,
  onRetry,
}: {
  etat: EnregistrementAgent;
  agent: ContexteAgentVulnerabilite;
  onRetry: () => void;
}) {
  if (etat === "ok") {
    return (
      <Alert
        type="success"
        closable={false}
        className="fr-mb-3w"
        title="Résultat enregistré sur le dossier"
        description={`${agent.nomDemandeur} le retrouvera dans son espace.`}
      />
    );
  }
  if (etat === "erreur") {
    return (
      <div className="fr-alert fr-alert--error fr-mb-3w">
        <h3 className="fr-alert__title">Le résultat n&apos;a pas pu être enregistré</h3>
        <p>Il n&apos;est pas encore rattaché au dossier.</p>
        <button type="button" className="fr-btn fr-btn--sm fr-mt-1w" onClick={onRetry}>
          Réessayer l&apos;enregistrement
        </button>
      </div>
    );
  }
  return (
    <Alert type="info" closable={false} className="fr-mb-3w" title="Enregistrement du résultat sur le dossier..." />
  );
}
