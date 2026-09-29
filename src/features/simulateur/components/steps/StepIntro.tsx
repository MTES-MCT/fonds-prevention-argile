"use client";

import Link from "next/link";
import { SimulateurLayout } from "../shared/SimulateurLayout";
import { NavigationButtons } from "../shared/NavigationButtons";
import { TOTAL_ETAPES } from "../../domain/value-objects/simulateur-step.enum";

interface StepIntroProps {
  onStart: () => void;
}

/**
 * Page d'introduction du simulateur
 */
export function StepIntro({ onStart }: StepIntroProps) {
  return (
    <SimulateurLayout
      title="Découvrez votre éligibilité en quelques minutes."
      currentStep={null}
      totalSteps={TOTAL_ETAPES}
      showProgress={false}>
      <p className="fr-text--lg fr-mb-2w">
        En quelques étapes, découvrez si votre logement et votre situation correspondent aux critères d&apos;éligibilité
        définis par l&apos;État pour bénéficier des aides du fonds prévention{" "}
        <Link
          href="https://www.legifrance.gouv.fr/loda/id/JORFTEXT000052201370/"
          target="_blank"
          rel="noopener noreferrer">
          (arrêté du 23 avril 2026)
        </Link>
        .
      </p>

      <NavigationButtons canGoBack={false} onNext={onStart} nextLabel="Démarrer" />
    </SimulateurLayout>
  );
}
