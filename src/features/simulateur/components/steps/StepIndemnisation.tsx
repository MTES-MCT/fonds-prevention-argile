"use client";

import { useState } from "react";
import type { PartialRGASimulationData } from "@/shared/domain/types";
import { SimulateurLayout } from "../shared/SimulateurLayout";
import { NavigationButtons } from "../shared/NavigationButtons";

interface StepIndemnisationProps {
  initialValue?: {
    dejaIndemnise?: boolean;
    montant?: number;
  };
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialRGASimulationData) => void;
  onBack: () => void;
}

/**
 * Étape 5 : Indemnisation RGA passée
 */
export function StepIndemnisation({
  initialValue,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onSubmit,
  onBack,
}: StepIndemnisationProps) {
  const [dejaIndemnise, setDejaIndemnise] = useState<boolean | undefined>(initialValue?.dejaIndemnise);
  const [montant, setMontant] = useState<string>(initialValue?.montant?.toString() ?? "");

  const isValid = dejaIndemnise !== undefined && (dejaIndemnise === false || montant !== "");

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({
      rga: {
        indemnise_indemnise_rga: dejaIndemnise,
        indemnise_montant_indemnite: dejaIndemnise ? parseInt(montant, 10) : 0,
      },
    });
  };

  return (
    <SimulateurLayout
      title="Avez-vous déjà été indemnisé au titre du RGA ?"
      description="Retrait-gonflement des argiles suite à une catastrophe naturelle"
      currentStep={numeroEtape}
      totalSteps={totalEtapes}>
      <fieldset className="fr-fieldset">
        <legend className="fr-fieldset__legend fr-sr-only">Indemnisation passée</legend>

        <div className="fr-fieldset__content">
          <div className="fr-radio-group">
            <input
              type="radio"
              id="indemnise-non"
              name="indemnisation"
              checked={dejaIndemnise === false}
              onChange={() => setDejaIndemnise(false)}
            />
            <label className="fr-label" htmlFor="indemnise-non">
              Non, jamais indemnisé
            </label>
          </div>

          <div className="fr-radio-group">
            <input
              type="radio"
              id="indemnise-oui"
              name="indemnisation"
              checked={dejaIndemnise === true}
              onChange={() => setDejaIndemnise(true)}
            />
            <label className="fr-label" htmlFor="indemnise-oui">
              Oui, j'ai déjà été indemnisé
            </label>
          </div>
        </div>
      </fieldset>

      {dejaIndemnise && (
        <div className="fr-input-group fr-mt-3w">
          <label className="fr-label" htmlFor="montant-indemnisation">
            Montant total des indemnisations reçues
            <span className="fr-hint-text">En euros</span>
          </label>
          <input
            className="fr-input fr-col-4"
            type="number"
            id="montant-indemnisation"
            min="0"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            placeholder="5000"
          />
        </div>
      )}

      <NavigationButtons onPrevious={onBack} onNext={handleSubmit} canGoBack={canGoBack} isNextDisabled={!isValid} />
    </SimulateurLayout>
  );
}
