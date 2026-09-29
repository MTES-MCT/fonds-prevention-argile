"use client";

import { useId, useState } from "react";
import type { PartialRGASimulationData } from "@/shared/domain/types";
import { asString } from "@/shared/utils";
import { SimulateurLayout } from "../shared/SimulateurLayout";
import { NavigationButtons } from "../shared/NavigationButtons";
import { useSimulateurStore, selectPrefillBatiment } from "../../stores/simulateur.store";

interface StepCaracteristiquesProps {
  initialValue?: { annee_de_construction?: unknown; niveaux?: unknown };
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialRGASimulationData) => void;
  onBack: () => void;
}

const NIVEAUX_OPTIONS = [
  { value: "", label: "Sélectionner" },
  ...Array.from({ length: 9 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
  { value: "10", label: "10 ou plus" },
];

/**
 * Étape 2 (2e écran) : année de construction et nombre de niveaux, préremplis depuis la BDNB.
 * Séparée de la carte pour que « Suivant » reste visible sans défiler.
 */
export function StepCaracteristiques({
  initialValue,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onSubmit,
  onBack,
}: StepCaracteristiquesProps) {
  const prefill = useSimulateurStore(selectPrefillBatiment);
  const inputId = useId();

  const [annee, setAnnee] = useState<string>(
    () => asString(initialValue?.annee_de_construction) || prefill?.anneeConstruction?.toString() || ""
  );
  const [niveaux, setNiveaux] = useState<string>(
    () => asString(initialValue?.niveaux) || prefill?.nombreNiveaux?.toString() || ""
  );

  const tousPreremplis = prefill?.anneeConstruction != null && prefill?.nombreNiveaux != null;
  const anneeValide = /^\d{4}$/.test(annee);
  const isValid = anneeValide && niveaux !== "";

  const handleAnneeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d{0,4}$/.test(value)) setAnnee(value);
  };

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({
      logement: { annee_de_construction: annee, niveaux: parseInt(niveaux, 10) },
    });
  };

  return (
    <SimulateurLayout
      title={
        tousPreremplis
          ? "Veuillez vérifier les informations suivantes et les corriger si elles sont inexactes :"
          : "Veuillez compléter les informations de votre logement :"
      }
      currentStep={numeroEtape}
      totalSteps={totalEtapes}>
      {prefill?.donneesIndisponibles && (
        <div className="fr-alert fr-alert--info fr-alert--sm fr-mb-3w" role="status">
          <p>
            Nous n&apos;avons pas réussi à récupérer les informations de ce bâtiment depuis nos bases de données. Vous
            pouvez les renseigner vous-même ci-dessous.
          </p>
        </div>
      )}

      <div className="fr-input-group">
        <label className="fr-label" htmlFor={`annee-${inputId}`}>
          Année de construction du logement
        </label>
        <input
          className="fr-input md:w-1/3!"
          type="text"
          inputMode="numeric"
          id={`annee-${inputId}`}
          name="anneeConstruction"
          value={annee}
          onChange={handleAnneeChange}
        />
      </div>

      <div className="fr-select-group">
        <label className="fr-label" htmlFor={`niveaux-${inputId}`}>
          Nombre de niveaux du logement
          <span className="fr-hint-text">
            Sous-sol compris (ex : 1 sous-sol + 1 rez-de-chaussée + 1 étage = 3 niveaux)
          </span>
        </label>
        <select
          className="fr-select md:w-1/3!"
          id={`niveaux-${inputId}`}
          name="nombreNiveaux"
          value={niveaux}
          onChange={(e) => setNiveaux(e.target.value)}>
          {NIVEAUX_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <p className="fr-text--xs fr-mb-2w text-(--text-mention-grey)">
        Données issues du{" "}
        <a href="https://rnb.beta.gouv.fr/" target="_blank" rel="noopener noreferrer">
          RNB
        </a>{" "}
        et de la{" "}
        <a href="https://bdnb.io/" target="_blank" rel="noopener noreferrer">
          BDNB
        </a>{" "}
        et de{" "}
        <a href="https://www.georisques.gouv.fr/" target="_blank" rel="noopener noreferrer">
          Géorisques
        </a>
      </p>

      <NavigationButtons
        onPrevious={onBack}
        onNext={handleSubmit}
        canGoBack={canGoBack}
        isNextDisabled={!isValid}
        aideDesactive="Renseignez l'année de construction (4 chiffres) et le nombre de niveaux."
      />
    </SimulateurLayout>
  );
}
