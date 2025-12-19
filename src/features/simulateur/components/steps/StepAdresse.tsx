"use client";

import type { PartialRGASimulationData } from "@/shared/domain/types";
import { SimulateurLayout } from "../shared/SimulateurLayout";
import { NavigationButtons } from "../shared/NavigationButtons";

interface StepAdresseProps {
  initialValue?: Record<string, unknown>;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialRGASimulationData) => void;
  onBack: () => void;
}

/**
 * Étape 2 : Adresse du logement (MOCK)
 */
export function StepAdresse({ numeroEtape, totalEtapes, canGoBack, onSubmit, onBack }: StepAdresseProps) {
  const handleSubmit = () => {
    // Données mockées d'une adresse éligible
    onSubmit({
      logement: {
        adresse: "91 rue de Notz, 36000 Châteauroux",
        commune: "36044",
        commune_nom: "Châteauroux",
        code_departement: "36",
        code_region: "24",
        coordonnees: "46.8167,1.6833",
        clef_ban: "36044_1234",
        epci: "243600327",
        zone_dexposition: "fort",
        annee_de_construction: "1985",
        niveaux: 2,
        rnb: "RNB123456",
      },
    });
  };

  return (
    <SimulateurLayout
      title="Où se situe votre logement ?"
      subtitle="[MOCK] Cliquez sur Suivant pour simuler une adresse éligible"
      currentStep={numeroEtape}
      totalSteps={totalEtapes}>
      <div className="fr-callout fr-callout--blue-ecume fr-mb-4w">
        <p className="fr-callout__text">
          <strong>Mode mock activé</strong>
          <br />
          Adresse : 91 rue de Notz, 36000 Châteauroux
          <br />
          Département : 36 (éligible)
          <br />
          Zone : Fort
          <br />
          Année : 1985
          <br />
          Niveaux : 2
        </p>
      </div>

      <NavigationButtons onPrevious={onBack} onNext={handleSubmit} canGoBack={canGoBack} isNextDisabled={false} />
    </SimulateurLayout>
  );
}
