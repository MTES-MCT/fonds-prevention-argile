"use client";

import { useState } from "react";
import type { PartialRGASimulationData } from "@/shared/domain/types";
import type { EtatSinistre } from "../../domain/value-objects/simulation-constants";
import { SimulateurLayout } from "../shared/SimulateurLayout";
import { NavigationButtons } from "../shared/NavigationButtons";

interface StepEtatMaisonProps {
  initialValue?: EtatSinistre;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialRGASimulationData) => void;
  onBack: () => void;
}

/**
 * Étape 3 : État de la maison
 */
export function StepEtatMaison({
  initialValue,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onSubmit,
  onBack,
}: StepEtatMaisonProps) {
  const [selected, setSelected] = useState<EtatSinistre | undefined>(initialValue);

  const handleSubmit = () => {
    if (!selected) return;
    onSubmit({
      rga: { sinistres: selected },
    });
  };

  return (
    <SimulateurLayout
      title="Quel est l'état actuel de votre maison ?"
      description="Concernant les fissures et désordres liés au sol"
      currentStep={numeroEtape}
      totalSteps={totalEtapes}>
      <fieldset className="fr-fieldset">
        <legend className="fr-fieldset__legend fr-sr-only">État de la maison</legend>

        <div className="fr-fieldset__content">
          <div className="fr-radio-group">
            <input
              type="radio"
              id="etat-saine"
              name="etat-maison"
              value="saine"
              checked={selected === "saine"}
              onChange={() => setSelected("saine")}
            />
            <label className="fr-label" htmlFor="etat-saine">
              Saine
              <span className="fr-hint-text">Aucune fissure visible</span>
            </label>
          </div>

          <div className="fr-radio-group">
            <input
              type="radio"
              id="etat-tres-peu-endommagee"
              name="etat-maison"
              value="très peu endommagée"
              checked={selected === "très peu endommagée"}
              onChange={() => setSelected("très peu endommagée")}
            />
            <label className="fr-label" htmlFor="etat-tres-peu-endommagee">
              Très peu endommagée
              <span className="fr-hint-text">Quelques microfissures superficielles</span>
            </label>
          </div>

          <div className="fr-radio-group">
            <input
              type="radio"
              id="etat-endommagee"
              name="etat-maison"
              value="endommagée"
              checked={selected === "endommagée"}
              onChange={() => setSelected("endommagée")}
            />
            <label className="fr-label" htmlFor="etat-endommagee">
              Endommagée
              <span className="fr-hint-text">Fissures importantes, désordres structurels</span>
            </label>
          </div>
        </div>
      </fieldset>

      <NavigationButtons onPrevious={onBack} onNext={handleSubmit} canGoBack={canGoBack} isNextDisabled={!selected} />
    </SimulateurLayout>
  );
}
