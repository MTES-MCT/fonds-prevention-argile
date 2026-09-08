"use client";

import { useState, useEffect, useCallback, useId } from "react";
import { useDebounce } from "@/shared/hooks/useDebounce";
import {
  searchAddress,
  mapBanFeatureToAddressData,
  formatCoordinatesString,
  MIN_QUERY_LENGTH,
  type BanFeature,
} from "@/shared/adapters/ban";
import { RgaMapContainer } from "@/features/rga-map";
import { getRgaRiskLevel, type BuildingData } from "@/shared/services/bdnb";
import { VulnerabiliteLayout } from "../../shared/VulnerabiliteLayout";
import { NavigationButtons } from "../../shared/NavigationButtons";
import { AleaBadgeDisplay } from "./AleaBadgeDisplay";
import type {
  VulnerabiliteAdresseReponses,
  PartialVulnerabiliteReponses,
} from "../../../domain/types/vulnerabilite-reponses.types";

interface StepAdresseVulnerabiliteProps {
  initialValue?: VulnerabiliteAdresseReponses;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialVulnerabiliteReponses) => void;
  onBack: () => void;
}

const SEARCH_DEBOUNCE_DELAY = 300;

/**
 * Étape adresse, allégée par rapport à `StepAdresse` du simulateur d'éligibilité :
 * pas d'EPCI (aucun critère de la grille de vulnérabilité n'en a besoin), pas de
 * formulaire année de construction / niveaux (ce simulateur ne pose aucune question
 * sur le bâtiment). Seul l'aléa RGA du bâtiment sélectionné est retenu.
 */
export function StepAdresseVulnerabilite({
  initialValue,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onSubmit,
  onBack,
}: StepAdresseVulnerabiliteProps) {
  const inputId = useId();
  const radioGroupId = useId();

  const [addressInput, setAddressInput] = useState(initialValue?.label ?? "");
  const [addressResults, setAddressResults] = useState<BanFeature[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<BanFeature | null>(null);
  const [buildingData, setBuildingData] = useState<BuildingData | null>(null);

  const debouncedInput = useDebounce(addressInput, SEARCH_DEBOUNCE_DELAY);

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!debouncedInput || debouncedInput.length < MIN_QUERY_LENGTH) {
        setAddressResults(null);
        setSearchError(null);
        return;
      }
      if (selectedAddress?.properties.label === debouncedInput) return;

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

  const handleAddressSelect = useCallback((feature: BanFeature) => {
    setSelectedAddress(feature);
    setAddressInput(feature.properties.label);
    setAddressResults(null);
    setBuildingData(null);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setAddressInput(value);
      if (selectedAddress && value !== selectedAddress.properties.label) {
        setSelectedAddress(null);
        setBuildingData(null);
      }
    },
    [selectedAddress]
  );

  const handleSubmit = useCallback(() => {
    if (!selectedAddress || !buildingData) return;

    const addressData = mapBanFeatureToAddressData(selectedAddress);

    onSubmit({
      adresse: {
        label: buildingData.adresse || addressData.label,
        communeNom: addressData.nomCommune,
        codeDepartement: addressData.codeDepartement,
        coordonnees: formatCoordinatesString({ lat: buildingData.lat, lon: buildingData.lon }),
        clefBan: addressData.clefBan,
        rnb: buildingData.rnbId,
        aleaRga: getRgaRiskLevel(buildingData.aleaArgiles),
      },
    });
  }, [selectedAddress, buildingData, onSubmit]);

  const isValid = selectedAddress !== null && buildingData !== null;

  const mapCenter = selectedAddress
    ? { lat: selectedAddress.geometry.coordinates[1], lon: selectedAddress.geometry.coordinates[0] }
    : undefined;

  const getInputGroupClass = (): string => {
    if (searchError) return "fr-input-group fr-input-group--error";
    if (selectedAddress) return "fr-input-group fr-input-group--valid";
    return "fr-input-group";
  };

  const showResults = addressResults && addressResults.length > 0 && !selectedAddress;
  const showNoResults = addressResults && addressResults.length === 0 && !selectedAddress && !isSearching;

  return (
    <VulnerabiliteLayout
      title="Où se situe votre logement ?"
      subtitle="Recherchez votre adresse puis sélectionnez votre logement sur la carte pour connaître l'aléa argile du sol."
      currentStep={numeroEtape}
      totalSteps={totalEtapes}>
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

      {selectedAddress && mapCenter && (
        <div
          className="fr-mb-4w border-solid border border-gray-200"
          style={{ backgroundColor: "#fff", borderRadius: "0.5rem", padding: "0.5rem" }}>
          {!buildingData && (
            <p className="fr-text--sm fr-text--bold fr-mb-2w">
              Cliquez sur votre bâtiment (point bleu) pour le sélectionner :
            </p>
          )}

          <RgaMapContainer
            center={mapCenter}
            showMarker={true}
            showLegend={true}
            variant="minimal"
            onBuildingSelect={setBuildingData}
          />

          {buildingData && (
            <AleaBadgeDisplay
              adresse={selectedAddress.properties.label}
              aleaRga={getRgaRiskLevel(buildingData.aleaArgiles)}
            />
          )}
        </div>
      )}

      <NavigationButtons onPrevious={onBack} onNext={handleSubmit} canGoBack={canGoBack} isNextDisabled={!isValid} />
    </VulnerabiliteLayout>
  );
}
