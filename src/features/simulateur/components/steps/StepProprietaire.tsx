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
      title="Êtes-vous propriétaire occupant de cette résidence principale ?"
      currentStep={numeroEtape}
      totalSteps={totalEtapes}>
      <fieldset className="fr-fieldset">
        <legend className="fr-fieldset__legend fr-sr-only">Propriétaire occupant</legend>

        <div className="fr-fieldset__content">
          <div className="fr-radio-group">
            <input
              type="radio"
              id="proprietaire-oui"
              name="proprietaire"
              checked={selected === true}
              onChange={() => setSelected(true)}
            />
            <label className="fr-label" htmlFor="proprietaire-oui">
              Oui, je suis propriétaire occupant
              <span className="fr-hint-text">C'est ma résidence principale</span>
            </label>
          </div>

          <div className="fr-radio-group">
            <input
              type="radio"
              id="proprietaire-non"
              name="proprietaire"
              checked={selected === false}
              onChange={() => setSelected(false)}
            />
            <label className="fr-label" htmlFor="proprietaire-non">
              Non
              <span className="fr-hint-text">Locataire, résidence secondaire, ou bailleur</span>
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
