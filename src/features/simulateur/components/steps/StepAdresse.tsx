"use client";

import { useState } from "react";
import type { PartialRGASimulationData } from "@/shared/domain/types";
import { SimulateurLayout } from "../shared/SimulateurLayout";
import { NavigationButtons } from "../shared/NavigationButtons";

interface AdresseData {
  adresse?: string;
  commune?: string;
  commune_nom?: string;
  code_departement?: string;
  code_region?: string;
  coordonnees?: string;
  clef_ban?: string;
  epci?: string;
  zone_dexposition?: "faible" | "moyen" | "fort";
  annee_de_construction?: string;
  niveaux?: number;
  rnb?: string;
}

interface StepAdresseProps {
  initialValue?: AdresseData;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialRGASimulationData) => void;
  onBack: () => void;
}

/**
 * Étape 2 : Adresse du logement
 * TODO: Intégrer la carte et l'API BAN
 */
export function StepAdresse({ initialValue, numeroEtape, totalEtapes, canGoBack, onSubmit, onBack }: StepAdresseProps) {
  const [adresse, setAdresse] = useState(initialValue?.adresse ?? "");
  const [anneeConstruction, setAnneeConstruction] = useState(initialValue?.annee_de_construction ?? "");
  const [niveaux, setNiveaux] = useState(initialValue?.niveaux?.toString() ?? "");

  // TODO: Ces valeurs seront remplies par la carte/API
  const [selectedData] = useState<AdresseData | null>(initialValue ?? null);

  const isValid = adresse && anneeConstruction && niveaux && selectedData?.zone_dexposition;

  const handleSubmit = () => {
    if (!isValid) return;

    onSubmit({
      logement: {
        adresse,
        commune: selectedData?.commune,
        commune_nom: selectedData?.commune_nom,
        code_departement: selectedData?.code_departement,
        code_region: selectedData?.code_region,
        coordonnees: selectedData?.coordonnees,
        clef_ban: selectedData?.clef_ban,
        epci: selectedData?.epci,
        zone_dexposition: selectedData?.zone_dexposition,
        annee_de_construction: anneeConstruction,
        niveaux: parseInt(niveaux, 10),
        rnb: selectedData?.rnb,
      },
    });
  };

  return (
    <SimulateurLayout title="Où se situe votre logement ?" currentStep={numeroEtape} totalSteps={totalEtapes}>
      <div className="fr-input-group">
        <label className="fr-label" htmlFor="adresse">
          Adresse du logement
          <span className="fr-hint-text">Commencez à taper puis sélectionnez votre adresse</span>
        </label>
        <input
          className="fr-input"
          type="text"
          id="adresse"
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          placeholder="12 rue de la Mairie, 75001 Paris"
        />
      </div>

      {/* TODO: Intégrer RgaMapContainer ici */}
      <div className="fr-callout fr-callout--blue-ecume fr-my-3w">
        <p className="fr-callout__text fr-text--sm">
          La carte permettra de sélectionner votre bâtiment et récupérer automatiquement la zone d'exposition argile.
        </p>
      </div>

      <div className="fr-input-group">
        <label className="fr-label" htmlFor="annee-construction">
          Année de construction
        </label>
        <input
          className="fr-input fr-col-4"
          type="number"
          id="annee-construction"
          min="1800"
          max={new Date().getFullYear()}
          value={anneeConstruction}
          onChange={(e) => setAnneeConstruction(e.target.value)}
          placeholder="1985"
        />
      </div>

      <div className="fr-input-group">
        <label className="fr-label" htmlFor="niveaux">
          Nombre de niveaux (R+1 = 2 niveaux)
        </label>
        <input
          className="fr-input fr-col-4"
          type="number"
          id="niveaux"
          min="1"
          max="10"
          value={niveaux}
          onChange={(e) => setNiveaux(e.target.value)}
          placeholder="2"
        />
      </div>

      <NavigationButtons onPrevious={onBack} onNext={handleSubmit} canGoBack={canGoBack} isNextDisabled={!isValid} />
    </SimulateurLayout>
  );
}
