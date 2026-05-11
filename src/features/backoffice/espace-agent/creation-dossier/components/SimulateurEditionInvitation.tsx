"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SimulateurProvider } from "@/features/simulateur/components/shared/SimulateurContext";
import { SimulateurFormulaire } from "@/features/simulateur/components/SimulateurFormulaire";
import {
  useSimulateurStore,
  selectCurrentStep,
  selectIsEligible,
} from "@/features/simulateur/stores/simulateur.store";
import { SimulateurStep } from "@/features/simulateur/domain/value-objects/simulateur-step.enum";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import { ResultInvitation } from "./ResultInvitation";

interface SimulateurEditionInvitationProps {
  parcoursId: string;
  initialData: RGASimulationData | null;
  /** Email du demandeur (affiché à l'étape résultat pour le mail d'invitation). */
  demandeurEmail: string;
}

/**
 * Variante AMO/AV de SimulateurEdition pour l'étape invitation.
 *
 * Différences avec SimulateurEdition classique :
 * - Mode `embedded` : les étapes sont rendues sans le layout externe du
 *   simulateur (carte/fond/formTitle/helpLink), pour s'intégrer dans la carte
 *   du wizard invitation (stepper "Étape 3 sur 4" géré par la page parente).
 * - L'étape INTRO est skippée et la simulation démarre directement à
 *   TYPE_LOGEMENT, avec des réponses pré-remplies si initialData est fourni.
 * - L'écran de résultat est remplacé par `ResultInvitation` (callout +
 *   bullets + bouton "Envoyer et enregistrer le dossier") via le context.
 *
 * Partage le store singleton `useSimulateurStore` avec le simulateur public et
 * le mode édition AMO. Compromis assumé : un agent ne fait pas de simulation
 * publique en parallèle d'un wizard invitation.
 */
export function SimulateurEditionInvitation({
  parcoursId,
  initialData,
  demandeurEmail,
}: SimulateurEditionInvitationProps) {
  const router = useRouter();
  const reset = useSimulateurStore((state) => state.reset);
  const setEditMode = useSimulateurStore((state) => state.setEditMode);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    reset();
    setEditMode(true);
    useSimulateurStore.getState().setHydrated();

    useSimulateurStore.setState((state) => ({
      simulation: {
        ...state.simulation,
        currentStep: SimulateurStep.TYPE_LOGEMENT,
        history: [],
        answers: initialData
          ? {
              logement: initialData.logement,
              taxeFonciere: initialData.taxeFonciere,
              rga: initialData.rga,
              menage: initialData.menage,
              vous: initialData.vous,
            }
          : state.simulation.answers,
      },
    }));

    setIsReady(true);

    return () => {
      setEditMode(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isReady) return null;

  return (
    <SimulateurProvider
      embedded
      showHelpLink={false}
      initialData={initialData}
      dossierId={parcoursId}
      onBackBeyondFirstStep={() => router.back()}
      customResultComponent={({ checks, isEligible, onBack, onRestart }) => (
        <ResultInvitation
          parcoursId={parcoursId}
          demandeurEmail={demandeurEmail}
          checks={checks}
          isEligible={isEligible}
          onBack={onBack}
          onRestart={onRestart}
        />
      )}>
      <InvitationStepper />
      <div className="fr-mt-4w">
        <SimulateurFormulaire />
      </div>
    </SimulateurProvider>
  );
}

/**
 * Stepper du wizard invitation. Affiche dynamiquement "Étape 3 sur 4" pendant
 * la simulation et "Étape 4 sur 4" à l'écran résultat. Le titre change aussi
 * pour le cas non éligible ("et" au lieu de "puis").
 */
function InvitationStepper() {
  const currentStep = useSimulateurStore(selectCurrentStep);
  const isEligible = useSimulateurStore(selectIsEligible);
  const isResultStep = currentStep === SimulateurStep.RESULTAT;
  const displayStep = isResultStep ? 4 : 3;
  const title =
    isResultStep && !isEligible
      ? "Faire une simulation d’éligibilité et créer le dossier"
      : "Faire une simulation d’éligibilité puis créer le dossier";

  return (
    <div className="fr-stepper">
      <h2 className="fr-stepper__title">
        {title}
        <span className="fr-stepper__state">Étape {displayStep} sur 4</span>
      </h2>
      <div className="fr-stepper__steps" data-fr-current-step={displayStep} data-fr-steps={4}></div>
    </div>
  );
}
