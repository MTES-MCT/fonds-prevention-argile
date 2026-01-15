"use client";

import { useState, useEffect, useId } from "react";
import type { BuildingData } from "@/shared/services/bdnb";
import { getRgaRiskLevel } from "@/shared/services/bdnb";

/**
 * Données éditables du formulaire
 */
export interface BuildingFormData {
  anneeConstruction: number | null;
  nombreNiveaux: number | null;
}

interface BuildingDataFormProps {
  /** Adresse sélectionnée (pour affichage en-tête) */
  address: string;

  /** Données BDNB (peuvent être partielles ou null) */
  buildingData: BuildingData | null;

  /** Callback appelé quand les valeurs changent */
  onChange: (data: BuildingFormData) => void;
}

/** Options pour le select du nombre de niveaux */
const NIVEAUX_OPTIONS = [
  { value: "", label: "Sélectionner" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "7", label: "7" },
  { value: "8", label: "8" },
  { value: "9", label: "9" },
  { value: "10", label: "10 ou plus" },
];

/** Configuration des badges d'aléa */
const ALEA_CONFIG = {
  fort: { label: "ALÉA FORT", bgColor: "#CE614A", textColor: "#fff" },
  moyen: { label: "ALÉA MOYEN", bgColor: "#E4794A", textColor: "#fff" },
  faible: { label: "ALÉA FAIBLE", bgColor: "#E4CC5E", textColor: "#000" },
  nul: { label: "HORS ZONE", bgColor: "#e0e0e0", textColor: "#000" },
} as const;

/**
 * Formulaire de vérification/complétion des données du bâtiment
 *
 * Deux modes :
 * - Données présentes → champs pré-remplis, mode "vérifier"
 * - Données absentes → champs éditables, mode "compléter"
 */
export function BuildingDataForm({ address, buildingData, onChange }: BuildingDataFormProps) {
  const inputId = useId();

  // État local des valeurs éditables
  const [anneeConstruction, setAnneeConstruction] = useState<string>("");
  const [nombreNiveaux, setNombreNiveaux] = useState<string>("");

  // Déterminer si les champs sont pré-remplis ou non
  const hasAnnee = buildingData?.anneeConstruction != null;
  const hasNiveaux = buildingData?.nombreNiveaux != null;
  const hasAllData = hasAnnee && hasNiveaux;

  // Niveau de risque pour le badge
  const riskLevel = buildingData ? getRgaRiskLevel(buildingData.aleaArgiles) : "nul";
  const aleaConfig = ALEA_CONFIG[riskLevel];

  // Initialiser les valeurs depuis buildingData
  useEffect(() => {
    if (buildingData) {
      setAnneeConstruction(buildingData.anneeConstruction?.toString() || "");
      setNombreNiveaux(buildingData.nombreNiveaux?.toString() || "");
    }
  }, [buildingData]);

  // Notifier le parent des changements
  useEffect(() => {
    onChange({
      anneeConstruction: anneeConstruction ? parseInt(anneeConstruction, 10) : null,
      nombreNiveaux: nombreNiveaux ? parseInt(nombreNiveaux, 10) : null,
    });
  }, [anneeConstruction, nombreNiveaux, onChange]);

  // Gestionnaires de changement
  const handleAnneeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Accepter uniquement les chiffres
    if (value === "" || /^\d{0,4}$/.test(value)) {
      setAnneeConstruction(value);
    }
  };

  const handleNiveauxChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNombreNiveaux(e.target.value);
  };

  return (
    <div className="fr-p-2w border-solid border border-gray-200">
      <div className="fr-mb-4v" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <span className="fr-badge fr-badge--success">{buildingData?.adresse || address}</span>
        <span className="fr-badge fr-badge--error fr-badge--no-icon">{aleaConfig.label}</span>
      </div>

      {/* Titre */}
      <p className="fr-text--lg fr-text--bold fr-mb-3w">
        Merci de {hasAllData ? "vérifier" : "compléter"} les informations :
      </p>

      {/* Champ : Année de construction */}
      <div className="fr-input-group fr-mb-3w">
        <label className="fr-label" htmlFor={`annee-${inputId}`}>
          Année de construction
        </label>
        <input
          className="fr-input"
          type="text"
          inputMode="numeric"
          id={`annee-${inputId}`}
          name="anneeConstruction"
          value={anneeConstruction}
          onChange={handleAnneeChange}
          placeholder={hasAnnee ? undefined : "Ajouter"}
          style={hasAnnee ? { backgroundColor: "#f0f0f0" } : undefined}
        />
      </div>

      {/* Champ : Nombre de niveaux */}
      <div className="fr-select-group fr-mb-3w">
        <label className="fr-label" htmlFor={`niveaux-${inputId}`}>
          Nombre de niveaux du logement (sous-sol compris)
        </label>
        <select
          className="fr-select"
          id={`niveaux-${inputId}`}
          name="nombreNiveaux"
          value={nombreNiveaux}
          onChange={handleNiveauxChange}
          style={hasNiveaux ? { backgroundColor: "#f0f0f0" } : undefined}>
          {NIVEAUX_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Footer : Sources */}
      <p className="fr-text--xs" style={{ color: "#666" }}>
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
    </div>
  );
}
