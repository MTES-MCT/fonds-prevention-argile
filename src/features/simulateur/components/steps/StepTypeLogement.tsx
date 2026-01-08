"use client";

import { useState } from "react";
import type { PartialRGASimulationData } from "@/shared/domain/types";
import type { TypeLogement } from "../../domain/value-objects/simulation-constants";
import { SimulateurLayout } from "../shared/SimulateurLayout";
import { NavigationButtons } from "../shared/NavigationButtons";

interface StepTypeLogementProps {
  initialValue?: TypeLogement;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialRGASimulationData) => void;
  onBack: () => void;
}

/**
 * Étape 1 : Type de logement
 */
export function StepTypeLogement({
  initialValue,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onSubmit,
  onBack,
}: StepTypeLogementProps) {
  const [selected, setSelected] = useState<TypeLogement | undefined>(initialValue);

  const handleSubmit = () => {
    if (!selected) return;
    onSubmit({
      logement: { type: selected },
    });
  };

  return (
    <SimulateurLayout
      title="Le logement est-il une maison ou un appartement ?"
      subtitle="Par maison, nous entendons maison individuelle hors copropriété."
      currentStep={numeroEtape}
      totalSteps={totalEtapes}>
      <fieldset className="fr-fieldset md:w-1/2" id="type-logement-fieldset">
        <legend className="fr-fieldset__legend fr-sr-only">Type de logement</legend>

        <div className="fr-fieldset__element">
          <div className="fr-radio-group fr-radio-rich">
            <input
              type="radio"
              id="type-maison"
              name="type-logement"
              checked={selected === "maison"}
              onChange={() => setSelected("maison")}
            />
            <label className="fr-label" htmlFor="type-maison">
              Une maison
            </label>
          </div>
        </div>

        <div className="fr-fieldset__element">
          <div className="fr-radio-group fr-radio-rich">
            <input
              type="radio"
              id="type-appartement"
              name="type-logement"
              checked={selected === "appartement"}
              onChange={() => setSelected("appartement")}
            />
            <label className="fr-label" htmlFor="type-appartement">
              Un appartement
            </label>
          </div>
        </div>
      </fieldset>

      <NavigationButtons onPrevious={onBack} onNext={handleSubmit} canGoBack={canGoBack} isNextDisabled={!selected} />
    </SimulateurLayout>
  );
}
