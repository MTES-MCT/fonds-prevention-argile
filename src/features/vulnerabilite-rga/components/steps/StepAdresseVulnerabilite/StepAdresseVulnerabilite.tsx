"use client";

import { useState, useEffect, useCallback, useId } from "react";
import { useDebounce } from "@/shared/hooks/useDebounce";
import {
  searchAddress,
  mapBanFeatureToAddressData,
  formatCoordinatesString,
  adresseChoisieDepuisBan,
  banFeatureDepuisAdresse,
  MIN_QUERY_LENGTH,
  type BanFeature,
} from "@/shared/adapters/ban";
import { lireAdresseChoisie, useAdresseChoisieStore } from "@/shared/stores";
import { useAdresseTransmise } from "@/shared/hooks/useAdresseTransmise";
import { RgaMapContainer } from "@/features/rga-map";
import { getRgaRiskLevel, type BuildingData } from "@/shared/services/bdnb";
import { VulnerabiliteLayout } from "../../shared/VulnerabiliteLayout";
import { useVulnerabiliteContext } from "../../shared/VulnerabiliteContext";
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

  const memoriserAdresse = useAdresseChoisieStore((state) => state.memoriser);
  // Pour un agent, l'adresse vient du dossier : il ne lit ni n'écrit celle du navigateur, qui peut
  // porter l'adresse d'un autre demandeur.
  const { agent } = useVulnerabiliteContext();
  // Adresse déjà choisie dans le simulateur d'éligibilité, ou à l'étape précédente de celui-ci.
  const [adressePartagee] = useState(() => (agent ? agent.adresseInitiale : lireAdresseChoisie()));

  const [addressInput, setAddressInput] = useState(adressePartagee?.label ?? initialValue?.label ?? "");
  const [addressResults, setAddressResults] = useState<BanFeature[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<BanFeature | null>(() =>
    adressePartagee ? banFeatureDepuisAdresse(adressePartagee) : null
  );
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

  // Adresse fournie par l'intégrateur de l'iframe, dans le fragment d'URL : elle prime sur celle reprise.
  const [transmise, setTransmise] = useState<{ clefBan: string; rnb: string | null } | null>(null);
  useAdresseTransmise(!agent && !initialValue?.label, (resolution) => {
    if (resolution.statut === "resolue") {
      handleAddressSelect(resolution.feature);
      setTransmise({ clefBan: resolution.feature.properties.id, rnb: resolution.rnb });
    } else {
      setAddressInput(resolution.texte);
    }
  });

  const changerAdresse = useCallback(() => {
    setAddressInput("");
    setSelectedAddress(null);
    setBuildingData(null);
    setTransmise(null);
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

    if (!agent) {
      memoriserAdresse(
        adresseChoisieDepuisBan(selectedAddress, {
          rnb: buildingData.rnbId || null,
          coordonnees: { lat: buildingData.lat, lon: buildingData.lon },
          // L'EPCI ne se déduit pas d'ici : on ne garde que celui de la même commune.
          codeEpci: adressePartagee?.codeInsee === addressData.codeCommune ? adressePartagee.codeEpci : null,
        })
      );
    }

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
  }, [selectedAddress, buildingData, onSubmit, memoriserAdresse, adressePartagee, agent]);

  // aleaIndetermine bloque : getRgaRiskLevel(null) rendrait "nul" (= hors zone) un aléa qu'on
  // n'a pas pu déterminer, faussant la synthèse du résultat et la simulation enregistrée.
  const aleaIndetermine = Boolean(buildingData?.aleaIndetermine);
  const isValid = selectedAddress !== null && buildingData !== null && !aleaIndetermine;

  const mapCenter = selectedAddress
    ? { lat: selectedAddress.geometry.coordinates[1], lon: selectedAddress.geometry.coordinates[0] }
    : undefined;

  const getInputGroupClass = (): string => {
    if (searchError) return "fr-input-group fr-input-group--error";
    if (selectedAddress) return "fr-input-group fr-input-group--valid";
    return "fr-input-group";
  };

  const adresseTransmise = transmise !== null && selectedAddress?.properties.id === transmise.clefBan;
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

        {adresseTransmise && (
          <p className="fr-text--sm fr-mt-1w fr-mb-0 text-(--text-mention-grey)">
            Adresse renseignée par le site depuis lequel vous accédez au simulateur.{" "}
            <button type="button" className="fr-link fr-link--sm" onClick={changerAdresse}>
              Changer d&apos;adresse
            </button>
          </p>
        )}

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
          className="fr-mb-4w border-solid border border-(--border-default-grey)"
          style={{ backgroundColor: "var(--background-default-grey)", borderRadius: "0.5rem", padding: "0.5rem" }}>
          {!buildingData && (
            <p className="fr-text--sm fr-text--bold fr-mb-2w">
              Cliquez sur votre bâtiment (point bleu) pour le sélectionner :
            </p>
          )}

          <RgaMapContainer
            center={mapCenter}
            initialRnbId={
              adresseTransmise
                ? (transmise.rnb ?? undefined)
                : selectedAddress.properties.id === adressePartagee?.clefBan
                  ? (adressePartagee.rnb ?? undefined)
                  : undefined
            }
            showMarker={true}
            showLegend={true}
            variant="minimal"
            onBuildingSelect={setBuildingData}
          />

          {buildingData && !aleaIndetermine && (
            <AleaBadgeDisplay
              // L'adresse BAN recherchée reste figée après le premier clic : c'est celle du
              // bâtiment cliqué (rafraîchie à chaque clic, comme l'aléa) qui doit s'afficher —
              // même repli que handleSubmit.
              adresse={buildingData.adresse || selectedAddress.properties.label}
              aleaRga={getRgaRiskLevel(buildingData.aleaArgiles)}
            />
          )}

          {aleaIndetermine && (
            <div className="fr-alert fr-alert--error fr-alert--sm fr-mt-2w" role="alert">
              <p>
                Nous n&apos;avons pas pu vérifier si votre logement est situé en zone à risque (problème de connexion).
                Cliquez à nouveau sur votre bâtiment pour réessayer.
              </p>
            </div>
          )}
        </div>
      )}

      <NavigationButtons onPrevious={onBack} onNext={handleSubmit} canGoBack={canGoBack} isNextDisabled={!isValid} />
    </VulnerabiliteLayout>
  );
}
