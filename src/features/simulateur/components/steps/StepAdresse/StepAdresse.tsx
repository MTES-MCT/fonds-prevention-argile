"use client";

import { useState, useEffect, useCallback, useId } from "react";

import type { PartialRGASimulationData } from "@/shared/domain/types";
import { useDebounce } from "@/shared/hooks/useDebounce";
import {
  searchAddress,
  mapBanFeatureToAddressData,
  formatCoordinatesString,
  MIN_QUERY_LENGTH,
  type BanFeature,
} from "@/shared/adapters/ban";
import { RgaMapContainer } from "@/features/rga-map";
import type { BuildingData } from "@/shared/services/bdnb";

import { SimulateurLayout } from "../../shared/SimulateurLayout";
import { NavigationButtons } from "../../shared/NavigationButtons";
import { BuildingDataForm, type BuildingFormData } from "./BuildingDataForm";

interface StepAdresseProps {
  initialValue?: Record<string, unknown>;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialRGASimulationData) => void;
  onBack: () => void;
}

/** Délai de debounce pour la recherche d'adresse (ms) */
const SEARCH_DEBOUNCE_DELAY = 300;

/**
 * Étape 2 : Adresse du logement
 *
 * Flux utilisateur :
 * 1. Saisie d'une adresse dans l'input
 * 2. Sélection d'une adresse parmi les résultats (RadioButtons)
 * 3. Carte affichée, centrée sur l'adresse
 * 4. Clic sur un bâtiment (point bleu) pour le sélectionner
 * 5. Vérification/complétion des informations du bâtiment
 * 6. Validation avec le bouton "Suivant"
 */
export function StepAdresse({ initialValue, numeroEtape, totalEtapes, canGoBack, onSubmit, onBack }: StepAdresseProps) {
  // IDs uniques pour l'accessibilité
  const inputId = useId();
  const radioGroupId = useId();

  // État de la recherche d'adresse
  const [addressInput, setAddressInput] = useState<string>((initialValue?.adresse as string) || "");
  const [addressResults, setAddressResults] = useState<BanFeature[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Adresse sélectionnée (après clic sur RadioButton)
  const [selectedAddress, setSelectedAddress] = useState<BanFeature | null>(null);

  // Bâtiment sélectionné sur la carte (après clic sur point bleu)
  const [buildingData, setBuildingData] = useState<BuildingData | null>(null);

  // Données du formulaire (potentiellement éditées par l'utilisateur)
  const [formData, setFormData] = useState<BuildingFormData>({
    anneeConstruction: null,
    nombreNiveaux: null,
  });

  // Debounce de l'input pour éviter trop d'appels API
  const debouncedInput = useDebounce(addressInput, SEARCH_DEBOUNCE_DELAY);

  // Recherche d'adresses quand l'input change
  useEffect(() => {
    const fetchAddresses = async () => {
      // Reset si input trop court
      if (!debouncedInput || debouncedInput.length < MIN_QUERY_LENGTH) {
        setAddressResults(null);
        setSearchError(null);
        return;
      }

      // Ne pas rechercher si une adresse est déjà sélectionnée avec ce label
      if (selectedAddress?.properties.label === debouncedInput) {
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        const results = await searchAddress(debouncedInput);
        setAddressResults(results);
      } catch (error) {
        console.error("Erreur recherche adresse:", error);
        setSearchError("Erreur lors de la recherche d'adresse. Veuillez réessayer.");
        setAddressResults(null);
      } finally {
        setIsSearching(false);
      }
    };

    fetchAddresses();
  }, [debouncedInput, selectedAddress?.properties.label]);

  // Gestionnaire de sélection d'adresse
  const handleAddressSelect = useCallback((feature: BanFeature) => {
    setSelectedAddress(feature);
    setAddressInput(feature.properties.label);
    setAddressResults(null);
    // Reset du bâtiment sélectionné car nouvelle adresse
    setBuildingData(null);
    setFormData({ anneeConstruction: null, nombreNiveaux: null });
  }, []);

  // Gestionnaire de changement d'input
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setAddressInput(value);

      // Si l'utilisateur modifie l'input après avoir sélectionné une adresse, on reset
      if (selectedAddress && value !== selectedAddress.properties.label) {
        setSelectedAddress(null);
        setBuildingData(null);
        setFormData({ anneeConstruction: null, nombreNiveaux: null });
      }
    },
    [selectedAddress]
  );

  // Gestionnaire de sélection de bâtiment sur la carte
  const handleBuildingSelect = useCallback((data: BuildingData | null) => {
    setBuildingData(data);
    // Reset formData pour que BuildingDataForm réinitialise avec les nouvelles données
    if (data) {
      setFormData({
        anneeConstruction: data.anneeConstruction,
        nombreNiveaux: data.nombreNiveaux,
      });
    } else {
      setFormData({ anneeConstruction: null, nombreNiveaux: null });
    }
  }, []);

  // Gestionnaire de changement du formulaire
  const handleFormChange = useCallback((data: BuildingFormData) => {
    setFormData(data);
  }, []);

  // Soumission du formulaire
  const handleSubmit = useCallback(() => {
    if (!selectedAddress || !buildingData) return;

    const addressData = mapBanFeatureToAddressData(selectedAddress);

    onSubmit({
      logement: {
        adresse: addressData.label,
        commune: addressData.codeCommune,
        commune_nom: addressData.nomCommune,
        code_departement: addressData.codeDepartement,
        code_region: addressData.codeRegion,
        coordonnees: formatCoordinatesString(addressData.coordinates),
        clef_ban: addressData.clefBan,
        // Données du bâtiment (BDNB + potentiellement éditées)
        zone_dexposition: buildingData.aleaArgiles || undefined,
        annee_de_construction: formData.anneeConstruction?.toString(),
        niveaux: formData.nombreNiveaux ?? undefined,
        rnb: buildingData.rnbId,
      },
    });
  }, [selectedAddress, buildingData, formData, onSubmit]);

  // Validation : peut passer à l'étape suivante ?
  const isValid =
    selectedAddress !== null &&
    buildingData !== null &&
    formData.anneeConstruction !== null &&
    formData.nombreNiveaux !== null;

  // Coordonnées pour centrer la carte
  const mapCenter = selectedAddress
    ? {
        lat: selectedAddress.geometry.coordinates[1],
        lon: selectedAddress.geometry.coordinates[0],
      }
    : undefined;

  // Déterminer l'état de l'input
  const getInputGroupClass = (): string => {
    if (searchError) return "fr-input-group fr-input-group--error";
    if (selectedAddress) return "fr-input-group fr-input-group--valid";
    return "fr-input-group";
  };

  // Afficher les résultats de recherche ou non
  const showResults = addressResults && addressResults.length > 0 && !selectedAddress;

  // Afficher le message "aucun résultat"
  const showNoResults = addressResults && addressResults.length === 0 && !selectedAddress && !isSearching;

  return (
    <SimulateurLayout
      title="Où se situe votre logement ?"
      subtitle="Recherchez votre adresse puis sélectionnez votre logement sur la carte"
      currentStep={numeroEtape}
      totalSteps={totalEtapes}>
      <div className="container ">
        {/* Recherche d'adresse */}
        <div className="fr-mb-4w">
          <div className={getInputGroupClass()} id={`input-group-${inputId}`}>
            <input
              className="fr-input"
              aria-describedby={`input-${inputId}-messages`}
              id={`input-${inputId}`}
              type="text"
              value={addressInput}
              onChange={handleInputChange}
              name="adresse"
              placeholder="Ex: 97 rue de Notz, Châteauroux"
              autoComplete="street-address"
              autoFocus
            />
            <div className="fr-messages-group" id={`input-${inputId}-messages`} aria-live="polite">
              {searchError && <p className="fr-message fr-message--error">{searchError}</p>}
              {selectedAddress && !buildingData && <p className="fr-message fr-message--valid">Adresse valide.</p>}
              {isSearching && <p className="fr-message fr-message--info">Recherche en cours...</p>}
              {addressInput.length > 0 && addressInput.length < MIN_QUERY_LENGTH && !selectedAddress && (
                <p className="fr-message fr-message--info">Saisissez au moins {MIN_QUERY_LENGTH} caractères</p>
              )}
              {showNoResults && (
                <p className="fr-message fr-message--error">Aucune adresse trouvée. Vérifiez votre saisie.</p>
              )}
            </div>
          </div>

          {/* Liste des résultats (RadioButtons) */}
          {showResults && (
            <fieldset
              className="fr-fieldset fr-mt-2w"
              id={`fieldset-${radioGroupId}`}
              aria-labelledby={`fieldset-${radioGroupId}-legend`}>
              <legend
                className="fr-fieldset__legend--regular fr-fieldset__legend italic"
                id={`fieldset-${radioGroupId}-legend`}>
                Sélectionnez votre adresse parmi les résultats suivants :
              </legend>
              {addressResults.map((feature, index) => (
                <div className="fr-fieldset__element" key={feature.properties.id}>
                  <div className="fr-radio-group">
                    <input
                      type="radio"
                      id={`radio-${radioGroupId}-${index}`}
                      name={`radios-group-${radioGroupId}`}
                      value={feature.properties.id}
                      onChange={() => handleAddressSelect(feature)}
                    />
                    <label className="fr-label" htmlFor={`radio-${radioGroupId}-${index}`}>
                      {feature.properties.label}
                    </label>
                  </div>
                </div>
              ))}
            </fieldset>
          )}
        </div>

        {/* Container carte + formulaire */}
        {selectedAddress && mapCenter && (
          <div
            className="fr-mb-4w border-solid border border-gray-200"
            style={{
              backgroundColor: "#fff",
              borderRadius: "0.5rem",
              padding: "0.5rem",
            }}>
            {/* Message d'instruction (visible tant que pas de bâtiment sélectionné) */}
            {!buildingData && (
              <p className="fr-text--sm fr-text--bold fr-mb-2w">
                Cliquez sur votre bâtiment (point bleu) pour le sélectionner :
              </p>
            )}

            {/* Carte */}
            <RgaMapContainer
              center={mapCenter}
              showMarker={true}
              showLegend={true}
              variant="minimal"
              onBuildingSelect={handleBuildingSelect}
            />

            {/* Formulaire (visible après sélection d'un bâtiment) */}
            {buildingData && (
              <div className="px-2 py-1">
                <BuildingDataForm
                  address={selectedAddress.properties.label}
                  buildingData={buildingData}
                  onChange={handleFormChange}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <NavigationButtons onPrevious={onBack} onNext={handleSubmit} canGoBack={canGoBack} isNextDisabled={!isValid} />
    </SimulateurLayout>
  );
}
