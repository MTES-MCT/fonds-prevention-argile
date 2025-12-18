"use client";

import { useState } from "react";
import type { PartialRGASimulationData } from "@/shared/domain/types";
import { SimulateurLayout } from "../shared/SimulateurLayout";
import { NavigationButtons } from "../shared/NavigationButtons";

interface StepRevenusProps {
  initialValue?: {
    nombrePersonnes?: number;
    revenuFiscalReference?: number;
  };
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialRGASimulationData) => void;
  onBack: () => void;
}

/**
 * Étape 8 : Revenus du ménage
 */
export function StepRevenus({ initialValue, numeroEtape, totalEtapes, canGoBack, onSubmit, onBack }: StepRevenusProps) {
  const [nombrePersonnes, setNombrePersonnes] = useState<string>(initialValue?.nombrePersonnes?.toString() ?? "");
  const [revenuFiscal, setRevenuFiscal] = useState<string>(initialValue?.revenuFiscalReference?.toString() ?? "");

  const isValid = nombrePersonnes !== "" && revenuFiscal !== "";

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({
      menage: {
        personnes: parseInt(nombrePersonnes, 10),
        revenu_rga: parseInt(revenuFiscal, 10),
      },
    });
  };

  return (
    <SimulateurLayout
      title="Quels sont les revenus de votre ménage ?"
      currentStep={numeroEtape}
      totalSteps={totalEtapes}>
      <div className="fr-input-group">
        <label className="fr-label" htmlFor="nombre-personnes">
          Nombre de personnes dans le foyer
          <span className="fr-hint-text">Y compris vous-même</span>
        </label>
        <input
          className="fr-input fr-col-4"
          type="number"
          id="nombre-personnes"
          min="1"
          max="20"
          value={nombrePersonnes}
          onChange={(e) => setNombrePersonnes(e.target.value)}
          placeholder="2"
        />
      </div>

      <div className="fr-input-group fr-mt-3w">
        <label className="fr-label" htmlFor="revenu-fiscal">
          Revenu fiscal de référence
          <span className="fr-hint-text">Indiqué sur votre dernier avis d'imposition (ligne 25)</span>
        </label>
        <input
          className="fr-input fr-col-6"
          type="number"
          id="revenu-fiscal"
          min="0"
          value={revenuFiscal}
          onChange={(e) => setRevenuFiscal(e.target.value)}
          placeholder="35000"
        />
      </div>

      <div className="fr-callout fr-callout--blue-ecume fr-mt-3w">
        <p className="fr-callout__text fr-text--sm">
          Le revenu fiscal de référence permet de déterminer votre tranche de revenus et le taux de prise en charge de
          l'aide.
        </p>
      </div>

      <NavigationButtons onPrevious={onBack} onNext={handleSubmit} canGoBack={canGoBack} isNextDisabled={!isValid} />
    </SimulateurLayout>
  );
}
