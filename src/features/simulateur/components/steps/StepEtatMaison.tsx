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
      title="Quel est l'état de la maison ?"
      subtitle="⚠️ Prenez soin de lire les détails des réponses, cette étape est cruciale dans la suite de votre parcours."
      currentStep={numeroEtape}
      totalSteps={totalEtapes}>
      <fieldset className="fr-fieldset" id="etat-maison-fieldset" aria-labelledby="etat-maison-legend">
        <legend className="fr-fieldset__legend--regular fr-fieldset__legend fr-sr-only" id="etat-maison-legend">
          État de la maison
        </legend>

        <div className="fr-fieldset__element">
          <div className="fr-radio-group fr-radio-rich">
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
              <span className="fr-hint-text fr-text-default--info">
                Aucune fissure visible, à l'intérieur comme à l'extérieur
              </span>
            </label>
          </div>
        </div>

        <div className="fr-fieldset__element">
          <div className="fr-radio-group fr-radio-rich">
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
              <span className="fr-hint-text fr-text-default--info">
                Micro-fissures (<strong>1mm d'écartement maximum</strong>) sur les murs extérieurs et/ou intérieurs
              </span>
            </label>
          </div>
        </div>

        <div className="fr-fieldset__element">
          <div className="fr-radio-group fr-radio-rich">
            <input
              type="radio"
              id="etat-endommagee"
              name="etat-maison"
              value="endommagée"
              checked={selected === "endommagée"}
              onChange={() => setSelected("endommagée")}
            />
            <label className="fr-label" htmlFor="etat-endommagee">
              Endommagée avec des premiers désordres structuraux déjà présents
              <span className="fr-hint-text fr-text-default--info">
                Fissures importantes (<strong>supérieures à 1mm d'écartement</strong>) sur les murs extérieurs et/ou
                intérieurs
              </span>
            </label>
          </div>
        </div>
      </fieldset>

      <NavigationButtons onPrevious={onBack} onNext={handleSubmit} canGoBack={canGoBack} isNextDisabled={!selected} />
    </SimulateurLayout>
  );
}
