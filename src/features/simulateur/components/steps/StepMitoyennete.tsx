"use client";

import { useState } from "react";
import type { PartialRGASimulationData } from "@/shared/domain/types";
import { SimulateurLayout } from "../shared/SimulateurLayout";
import { NavigationButtons } from "../shared/NavigationButtons";

interface StepMitoyenneteProps {
  initialValue?: boolean;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialRGASimulationData) => void;
  onBack: () => void;
}

/**
 * Étape 4 : Mitoyenneté
 */
export function StepMitoyennete({
  initialValue,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onSubmit,
  onBack,
}: StepMitoyenneteProps) {
  const [selected, setSelected] = useState<boolean | undefined>(initialValue);

  const handleSubmit = () => {
    if (selected === undefined) return;
    onSubmit({
      logement: { mitoyen: selected },
    });
  };

  return (
    <SimulateurLayout title="La maison est-elle mitoyenne ?" currentStep={numeroEtape} totalSteps={totalEtapes}>
      <fieldset className="fr-fieldset md:w-1/2" id="mitoyennete-fieldset">
        <legend className="fr-fieldset__legend fr-sr-only">Mitoyenneté</legend>

        <div className="fr-fieldset__element">
          <div className="fr-radio-group fr-radio-rich">
            <input
              type="radio"
              id="mitoyen-non"
              name="mitoyennete"
              checked={selected === false}
              onChange={() => setSelected(false)}
            />
            <label className="fr-label" htmlFor="mitoyen-non">
              Non
            </label>
          </div>
        </div>

        <div className="fr-fieldset__element">
          <div className="fr-radio-group fr-radio-rich">
            <input
              type="radio"
              id="mitoyen-oui"
              name="mitoyennete"
              checked={selected === true}
              onChange={() => setSelected(true)}
            />
            <label className="fr-label" htmlFor="mitoyen-oui">
              Oui
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
