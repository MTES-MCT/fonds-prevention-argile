"use client";

import { useState } from "react";
import type { PartialRGASimulationData } from "@/shared/domain/types";
import { SimulateurLayout } from "../shared/SimulateurLayout";
import { NavigationButtons } from "../shared/NavigationButtons";

interface StepAssuranceProps {
  initialValue?: boolean;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialRGASimulationData) => void;
  onBack: () => void;
}

/**
 * Étape 6 : Assurance habitation
 */
export function StepAssurance({
  initialValue,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onSubmit,
  onBack,
}: StepAssuranceProps) {
  const [selected, setSelected] = useState<boolean | undefined>(initialValue);

  const handleSubmit = () => {
    if (selected === undefined) return;
    onSubmit({
      rga: { assure: selected },
    });
  };

  return (
    <SimulateurLayout
      title="Votre maison est-elle couverte par une assurance habitation ?"
      currentStep={numeroEtape}
      totalSteps={totalEtapes}>
      <fieldset className="fr-fieldset">
        <legend className="fr-fieldset__legend fr-sr-only">Assurance habitation</legend>

        <div className="fr-fieldset__content">
          <div className="fr-radio-group">
            <input
              type="radio"
              id="assure-oui"
              name="assurance"
              checked={selected === true}
              onChange={() => setSelected(true)}
            />
            <label className="fr-label" htmlFor="assure-oui">
              Oui, ma maison est assurée
            </label>
          </div>

          <div className="fr-radio-group">
            <input
              type="radio"
              id="assure-non"
              name="assurance"
              checked={selected === false}
              onChange={() => setSelected(false)}
            />
            <label className="fr-label" htmlFor="assure-non">
              Non, ma maison n'est pas assurée
            </label>
          </div>
        </div>
      </fieldset>

      <NavigationButtons
        onPrevious={onBack}
        onNext={handleSubmit}
        canGoBack={canGoBack}
        isNextDisabled={selected === undefined}
      />
    </SimulateurLayout>
  );
}
