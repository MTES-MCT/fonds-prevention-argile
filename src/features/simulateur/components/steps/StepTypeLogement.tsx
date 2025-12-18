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
    <SimulateurLayout title="Quel est le type de votre logement ?" currentStep={numeroEtape} totalSteps={totalEtapes}>
      <fieldset className="fr-fieldset">
        <legend className="fr-fieldset__legend fr-sr-only">Type de logement</legend>

        <div className="fr-fieldset__content">
          <div className="fr-radio-group">
            <input
              type="radio"
              id="type-maison"
              name="type-logement"
              value="maison"
              checked={selected === "maison"}
              onChange={() => setSelected("maison")}
            />
            <label className="fr-label" htmlFor="type-maison">
              Maison individuelle
            </label>
          </div>

          <div className="fr-radio-group">
            <input
              type="radio"
              id="type-appartement"
              name="type-logement"
              value="appartement"
              checked={selected === "appartement"}
              onChange={() => setSelected("appartement")}
            />
            <label className="fr-label" htmlFor="type-appartement">
              Appartement
            </label>
          </div>
        </div>
      </fieldset>

      <NavigationButtons onPrevious={onBack} onNext={handleSubmit} canGoBack={canGoBack} isNextDisabled={!selected} />
    </SimulateurLayout>
  );
}
