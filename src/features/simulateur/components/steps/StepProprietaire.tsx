"use client";

import { useState } from "react";
import type { PartialRGASimulationData } from "@/shared/domain/types";
import { SimulateurLayout } from "../shared/SimulateurLayout";
import { NavigationButtons } from "../shared/NavigationButtons";

interface StepProprietaireProps {
  initialValue?: boolean;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialRGASimulationData) => void;
  onBack: () => void;
}

/**
 * Étape 7 : Propriétaire occupant
 */
export function StepProprietaire({
  initialValue,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onSubmit,
  onBack,
}: StepProprietaireProps) {
  const [selected, setSelected] = useState<boolean | undefined>(initialValue);

  const handleSubmit = () => {
    if (selected === undefined) return;
    onSubmit({
      logement: { proprietaire_occupant: selected },
    });
  };

  return (
    <SimulateurLayout
      title="Êtes-vous propriétaire occupant du logement concerné comme résidence principale ?"
      subtitle="Les résidences secondaires et les maisons en location sont exclues du dispositif."
      currentStep={numeroEtape}
      totalSteps={totalEtapes}>
      <fieldset className="fr-fieldset md:w-1/2" id="proprietaire-fieldset">
        <legend className="fr-fieldset__legend fr-sr-only">Propriétaire occupant</legend>

        <div className="fr-fieldset__element">
          <div className="fr-radio-group fr-radio-rich">
            <input
              type="radio"
              id="proprietaire-oui"
              name="proprietaire"
              checked={selected === true}
              onChange={() => setSelected(true)}
            />
            <label className="fr-label" htmlFor="proprietaire-oui">
              Oui
            </label>
          </div>
        </div>

        <div className="fr-fieldset__element">
          <div className="fr-radio-group fr-radio-rich">
            <input
              type="radio"
              id="proprietaire-non"
              name="proprietaire"
              checked={selected === false}
              onChange={() => setSelected(false)}
            />
            <label className="fr-label" htmlFor="proprietaire-non">
              Non
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
