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
import { getEpciByCommune } from "@/shared/adapters/geo";
import { RgaMapContainer } from "@/features/rga-map";
import { getBuildingDataByRnbId, getBuildingDataFallback, type BuildingData } from "@/shared/services/bdnb";
import { asString } from "@/shared/utils";

import { SimulateurLayout } from "../../shared/SimulateurLayout";
import { NavigationButtons } from "../../shared/NavigationButtons";
import { peutReprendreAdresseExistante } from "./adresse-reprise";
import { useSimulateurStore, selectEditMode } from "../../../stores/simulateur.store";

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
 * 5. Validation avec le bouton "Suivant" : année et niveaux se vérifient à l'écran suivant
 */
export function StepAdresse({ initialValue, numeroEtape, totalEtapes, canGoBack, onSubmit, onBack }: StepAdresseProps) {
  // Mode édition agent : verrouiller l'adresse
  const editMode = useSimulateurStore(selectEditMode);
  const isAddressLocked = editMode && peutReprendreAdresseExistante(initialValue);
  const setPrefillBatiment = useSimulateurStore((state) => state.setPrefillBatiment);

  // IDs uniques pour l'accessibilité
  const inputId = useId();
  const radioGroupId = useId();

  // État de la recherche d'adresse
  const [addressInput, setAddressInput] = useState<string>(() => {
    const adresse = asString(initialValue?.adresse);
    const communeNom = asString(initialValue?.commune_nom);
    if (adresse && communeNom && !adresse.includes(communeNom)) {
      return `${adresse}, ${communeNom}`;
    }
    return adresse || "";
  });
  const [addressResults, setAddressResults] = useState<BanFeature[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Adresse sélectionnée (après clic sur RadioButton)
  // En mode édition, on reconstruit un BanFeature synthétique pour afficher la carte directement
  const [selectedAddress, setSelectedAddress] = useState<BanFeature | null>(() => {
    const coordonnees = asString(initialValue?.coordonnees);
    const clefBan = asString(initialValue?.clef_ban);
    const adresse = asString(initialValue?.adresse);
    const commune = asString(initialValue?.commune);
    const communeNom = asString(initialValue?.commune_nom);
    const codeDepartement = asString(initialValue?.code_departement);

    if (coordonnees && clefBan && adresse && commune) {
      const [lat, lon] = coordonnees.split(",").map(Number);
      if (!isNaN(lat) && !isNaN(lon)) {
        const label = communeNom && !adresse.includes(communeNom) ? `${adresse}, ${communeNom}` : adresse;
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [lon, lat] },
          properties: {
            label,
            score: 1,
            id: clefBan,
            type: "housenumber" as const,
            name: adresse,
            postcode: "",
            citycode: commune,
            city: communeNom || "",
            context: codeDepartement || "",
          },
        };
      }
    }
    return null;
  });

  // RNB ID initial pour pré-sélectionner le bâtiment sur la carte en mode édition
  const initialRnbId = asString(initialValue?.rnb);

  // Code EPCI récupéré via API Geo
  const [codeEpci, setCodeEpci] = useState<string | null>(asString(initialValue?.epci) || null);

  // Bâtiment sélectionné sur la carte (après clic sur point bleu)
  // En mode édition, on construit directement le buildingData depuis la simulation existante (pas d'appel BDNB)
  const [buildingData, setBuildingData] = useState<BuildingData | null>(() => {
    if (!isAddressLocked) return null;
    const coordonnees = asString(initialValue?.coordonnees);
    if (!coordonnees) return null;
    const [lat, lon] = coordonnees.split(",").map(Number);
    if (isNaN(lat) || isNaN(lon)) return null;
    return {
      rnbId: asString(initialValue?.rnb) || "",
      lat,
      lon,
      adresse: asString(initialValue?.adresse) || null,
      aleaArgiles: asString(initialValue?.zone_dexposition) || null,
      anneeConstruction: initialValue?.annee_de_construction ? Number(initialValue.annee_de_construction) : null,
      nombreNiveaux: initialValue?.niveaux != null ? Number(initialValue.niveaux) : null,
      surfaceHabitable: null,
    } as BuildingData;
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
  const handleAddressSelect = useCallback(async (feature: BanFeature) => {
    setSelectedAddress(feature);
    setAddressInput(feature.properties.label);
    setAddressResults(null);
    // Reset du bâtiment sélectionné car nouvelle adresse
    setBuildingData(null);
    // Reset du code EPCI
    setCodeEpci(null);

    // Récupérer le code EPCI via API Geo
    try {
      const epci = await getEpciByCommune(feature.properties.citycode);
      setCodeEpci(epci);
    } catch (error) {
      console.error("Erreur récupération EPCI:", error);
      // On continue sans EPCI, le fallback département sera utilisé
    }
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
        setCodeEpci(null);
      }
    },
    [selectedAddress]
  );

  // Gestionnaire de sélection de bâtiment sur la carte
  const handleBuildingSelect = useCallback((data: BuildingData | null) => {
    setBuildingData(data);
  }, []);

  // Échappatoire manuelle si la carte ne répond pas (réseau lent, tuiles RNB non chargées) :
  // ne dépend ni de BDNB ni du clic carte, uniquement des coordonnées déjà connues de
  // l'adresse recherchée. Masquée par défaut : proposée seulement après un délai sans
  // sélection, ou si un clic sur la carte ne touche aucun bâtiment (signal direct que "ça ne
  // répond pas") - sinon tout le monde l'utiliserait sans même essayer la carte.
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [isFallbackLoading, setIsFallbackLoading] = useState(false);

  // Navigateur sans WebGL2 (Firefox à GPU sur liste noire, accélération coupée) : la carte ne
  // s'affichera jamais, il n'y a rien à attendre - la saisie manuelle est la seule voie.
  const [carteIndisponible, setCarteIndisponible] = useState(false);
  const handleCarteIndisponible = useCallback(() => setCarteIndisponible(true), []);
  const proposerSaisieManuelle = showManualFallback || carteIndisponible;

  // Mémoïsé : useRgaBuildingSelection prend ce callback en dépendance d'effet, une identité
  // instable y ré-abonnerait le handler de clic de la carte à chaque rendu.
  const handleEmptyClick = useCallback(() => setShowManualFallback(true), []);

  useEffect(() => {
    if (!selectedAddress || buildingData || isAddressLocked) {
      return;
    }
    setShowManualFallback(false);
    const timeout = setTimeout(() => setShowManualFallback(true), 8000);
    return () => clearTimeout(timeout);
  }, [selectedAddress, buildingData, isAddressLocked]);

  const chargerBatimentSansCarte = useCallback(async (): Promise<BuildingData | null> => {
    if (!selectedAddress) return null;
    setIsFallbackLoading(true);
    try {
      const coordonnees = buildingData
        ? { lat: buildingData.lat, lon: buildingData.lon }
        : { lat: selectedAddress.geometry.coordinates[1], lon: selectedAddress.geometry.coordinates[0] };
      // Réessai sur un bâtiment déjà cliqué : repasser par son RNB plutôt que de le dégrader
      // en squelette, le bâtiment étant bien identifié - seul l'aléa avait échoué.
      const data = buildingData?.rnbId
        ? await getBuildingDataByRnbId(buildingData.rnbId, coordonnees)
        : await getBuildingDataFallback(coordonnees);
      handleBuildingSelect(data);
      return data;
    } finally {
      setIsFallbackLoading(false);
    }
  }, [selectedAddress, buildingData, handleBuildingSelect]);

  const soumettreBatiment = useCallback(
    (batiment: BuildingData) => {
      if (!selectedAddress) return;

      const addressData = mapBanFeatureToAddressData(selectedAddress, { codeEpci: codeEpci ?? undefined });
      // Autre bâtiment qu'à l'arrivée : l'année et les niveaux déjà répondus ne le décrivent plus.
      const memeBatiment = isAddressLocked || (!!initialRnbId && batiment.rnbId === initialRnbId);

      setPrefillBatiment({
        anneeConstruction: batiment.anneeConstruction,
        nombreNiveaux: batiment.nombreNiveaux,
        donneesIndisponibles: Boolean(batiment.donneesIndisponibles),
      });

      onSubmit({
        logement: {
          adresse: batiment.adresse || addressData.label,
          commune: addressData.codeCommune,
          commune_nom: addressData.nomCommune,
          code_departement: addressData.codeDepartement,
          code_region: addressData.codeRegion,
          epci: addressData.codeEpci,
          // Utiliser les coordonnées du bâtiment sélectionné
          coordonnees: formatCoordinatesString({ lat: batiment.lat, lon: batiment.lon }),
          clef_ban: addressData.clefBan,
          // Données du bâtiment (BDNB + potentiellement éditées)
          // null = hors zone argileuse (réponse à part entière, distincte de "non répondu")
          zone_dexposition: batiment.aleaArgiles,
          rnb: batiment.rnbId,
          ...(memeBatiment ? {} : { annee_de_construction: undefined, niveaux: undefined }),
        },
      });
    },
    [selectedAddress, codeEpci, onSubmit, isAddressLocked, initialRnbId, setPrefillBatiment]
  );

  const handleSubmit = useCallback(() => {
    if (buildingData) soumettreBatiment(buildingData);
  }, [buildingData, soumettreBatiment]);

  // Proposer de « renseigner soi-même » puis rester sur la carte serait incohérent : on passe à l'écran de saisie.
  const handleSaisieManuelle = useCallback(async () => {
    const batiment = await chargerBatimentSansCarte();
    if (batiment && !batiment.aleaIndetermine) soumettreBatiment(batiment);
  }, [chargerBatimentSansCarte, soumettreBatiment]);

  // aleaIndetermine bloque : l'aléa RGA n'est pas saisissable par l'utilisateur et null y a un
  // sens métier propre ("hors zone", cf. checkZoneForte) qu'un échec de récupération ne doit pas masquer.
  const aleaIndetermine = Boolean(buildingData?.aleaIndetermine);
  const isValid = selectedAddress !== null && buildingData !== null && !aleaIndetermine;

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
      {/* Recherche d'adresse */}
      <div className="fr-mb-3w">
        <div className={getInputGroupClass()} id={`input-group-${inputId}`}>
          <label className="fr-label fr-sr-only" htmlFor={`input-${inputId}`}>
            Adresse du logement
          </label>
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
            autoFocus={!isAddressLocked}
            readOnly={isAddressLocked}
          />
          <div className="fr-messages-group" id={`input-${inputId}-messages`} aria-live="polite">
            {searchError && <p className="fr-message fr-message--error">{searchError}</p>}
            {selectedAddress && <p className="fr-message fr-message--valid">Adresse validée</p>}
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

      {/* Carte */}
      {selectedAddress && mapCenter && (
        <div className="bg-(--background-default-grey) border border-(--border-default-grey) rounded-lg p-3 md:p-5 fr-mb-3w">
          <h2 className="fr-h5 fr-mb-1w">Sélectionnez votre logement sur la carte</h2>
          {!buildingData && !carteIndisponible && (
            <p className="fr-text--sm fr-mb-2w text-(--text-mention-grey)">
              Cliquez sur votre bâtiment (point bleu) pour le sélectionner.
            </p>
          )}

          <RgaMapContainer
            center={mapCenter}
            initialRnbId={isAddressLocked ? undefined : initialRnbId}
            locked={isAddressLocked}
            showMarker={true}
            showLegend={true}
            variant="minimal"
            height="clamp(240px, 45vh, 420px)"
            onBuildingSelect={isAddressLocked ? undefined : handleBuildingSelect}
            onEmptyClick={isAddressLocked ? undefined : handleEmptyClick}
            onCarteIndisponible={handleCarteIndisponible}
          />

          {aleaIndetermine && (
            <div className="fr-alert fr-alert--error fr-alert--sm fr-mt-2w" role="alert">
              <p>
                Nous n&apos;avons pas pu vérifier si votre logement est situé en zone à risque (problème de connexion).
              </p>
              {!isAddressLocked && (
                <p className="fr-mt-1w fr-mb-0">
                  <button
                    type="button"
                    className="fr-link fr-link--sm"
                    onClick={chargerBatimentSansCarte}
                    disabled={isFallbackLoading}>
                    {isFallbackLoading ? "Vérification en cours..." : "Réessayer la vérification"}
                  </button>
                </p>
              )}
            </div>
          )}

          {/* Échappatoire si la carte ne répond pas (délai écoulé, clic à vide, ou pas de WebGL2) */}
          {!buildingData && !isAddressLocked && proposerSaisieManuelle && (
            <p className="fr-text--sm fr-mt-2w fr-mb-0">
              <button
                type="button"
                className={carteIndisponible ? "fr-btn fr-btn--secondary fr-btn--sm" : "fr-link fr-link--sm"}
                onClick={handleSaisieManuelle}
                disabled={isFallbackLoading}>
                {isFallbackLoading
                  ? "Vérification en cours..."
                  : carteIndisponible
                    ? "Renseigner les informations de mon logement"
                    : "Vous ne trouvez pas votre bâtiment, ou la carte ne répond pas ? Renseignez les informations vous-même"}
              </button>
            </p>
          )}
        </div>
      )}

      <NavigationButtons
        onPrevious={onBack}
        onNext={handleSubmit}
        canGoBack={canGoBack}
        isNextDisabled={!isValid}
        aideDesactive={
          selectedAddress && !aleaIndetermine ? "Sélectionnez votre logement sur la carte pour continuer." : undefined
        }
      />
    </SimulateurLayout>
  );
}
