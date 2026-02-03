"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type maplibregl from "maplibre-gl";

import { SOURCE_IDS, LAYER_IDS, RNB_SOURCE_LAYER } from "../domain/config";
import type { SelectedBuilding } from "../domain/types";
import { getBuildingDataByRnbId, type BuildingData } from "@/shared/services/bdnb";

interface UseRgaBuildingSelectionOptions {
  map: maplibregl.Map | null;
  /** Active le hook globalement (sélection initiale + chargement des données) */
  enabled?: boolean;
  /** Active les interactions utilisateur (clics, survols) - peut être false même si enabled est true */
  enableInteractions?: boolean;
  initialRnbId?: string;
  initialCoordinates?: { lat: number; lon: number };
  onBuildingSelect?: (data: BuildingData | null) => void;
  onError?: (error: Error) => void;
}

interface UseRgaBuildingSelectionReturn {
  selectedBuilding: SelectedBuilding | null;
  buildingData: BuildingData | null;
  isLoading: boolean;
  error: Error | null;
  clearSelection: () => void;
}

/**
 * Hook pour gérer la sélection et le survol des bâtiments sur la carte
 */
export function useRgaBuildingSelection(options: UseRgaBuildingSelectionOptions): UseRgaBuildingSelectionReturn {
  const {
    map,
    enabled = true,
    enableInteractions = true,
    initialRnbId,
    initialCoordinates,
    onBuildingSelect,
    onError,
  } = options;

  const [selectedBuilding, setSelectedBuilding] = useState<SelectedBuilding | null>(null);
  const [buildingData, setBuildingData] = useState<BuildingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const hoveredIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const initialSelectionAppliedRef = useRef(false);
  const retryCountRef = useRef(0);

  // Pré-sélectionner un bâtiment par son ID RNB au chargement
  useEffect(() => {
    if (!map || !enabled || !initialRnbId || !initialCoordinates || initialSelectionAppliedRef.current) return;

    const applyInitialSelection = () => {
      // Vérifier si les sources sont prêtes et chargées
      const pointsSource = map.getSource(SOURCE_IDS.rnbPoints);
      const formesSource = map.getSource(SOURCE_IDS.rnbFormes);

      if (!pointsSource || !formesSource) {
        return false;
      }

      // Vérifier si les sources sont complètement chargées
      if (!map.isSourceLoaded(SOURCE_IDS.rnbPoints) || !map.isSourceLoaded(SOURCE_IDS.rnbFormes)) {
        return false;
      }

      try {
        // Vérifier si la feature existe dans les tuiles chargées par ID exact
        let pointFeatures = map.querySourceFeatures(SOURCE_IDS.rnbPoints, {
          sourceLayer: RNB_SOURCE_LAYER,
          filter: ["==", ["id"], initialRnbId],
        });
        let formeFeatures = map.querySourceFeatures(SOURCE_IDS.rnbFormes, {
          sourceLayer: RNB_SOURCE_LAYER,
          filter: ["==", ["id"], initialRnbId],
        });

        // Si pas trouvé par ID, chercher le bâtiment le plus proche des coordonnées
        if (pointFeatures.length === 0 && formeFeatures.length === 0) {
          const centerPoint = map.project([initialCoordinates.lon, initialCoordinates.lat]);
          const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
            [centerPoint.x - 50, centerPoint.y - 50],
            [centerPoint.x + 50, centerPoint.y + 50],
          ];

          const nearbyPoints = map.queryRenderedFeatures(bbox, {
            layers: [LAYER_IDS.rnbPoints],
          });
          const nearbyFormes = map.queryRenderedFeatures(bbox, {
            layers: [LAYER_IDS.rnbFormes],
          });

          // Prendre le premier bâtiment trouvé proche des coordonnées
          if (nearbyPoints.length > 0) {
            pointFeatures = [nearbyPoints[0]];
          } else if (nearbyFormes.length > 0) {
            formeFeatures = [nearbyFormes[0]];
          }
        }

        if (pointFeatures.length === 0 && formeFeatures.length === 0) {
          retryCountRef.current++;
          return false;
        }

        // Utiliser l'ID de la feature trouvée (qui peut être différent de initialRnbId si on a fait une recherche spatiale)
        const foundFeature = pointFeatures[0] || formeFeatures[0];
        const foundRnbId = foundFeature.id as string;

        // Appliquer l'état de sélection visuelle
        setFeatureState(map, foundRnbId, "selected", true);
        selectedIdRef.current = foundRnbId;

        // Mettre à jour l'état React (utiliser l'ID trouvé ou l'ID initial si c'est le même)
        setSelectedBuilding({
          rnbId: foundRnbId,
          coordinates: initialCoordinates,
        });

        initialSelectionAppliedRef.current = true;
        return true;
      } catch {
        return false;
      }
    };

    // Handler pour l'événement sourcedata
    const handleSourceData = (e: maplibregl.MapSourceDataEvent) => {
      if (initialSelectionAppliedRef.current) return;

      // Vérifier si c'est une de nos sources qui vient d'être chargée
      if (e.sourceId === SOURCE_IDS.rnbPoints || e.sourceId === SOURCE_IDS.rnbFormes) {
        if (e.isSourceLoaded) {
          applyInitialSelection();
        }
      }
    };

    // Essayer d'appliquer immédiatement si tout est prêt
    if (map.isStyleLoaded() && applyInitialSelection()) {
      return;
    }

    // Sinon, écouter les événements de chargement des sources
    map.on("sourcedata", handleSourceData);

    // Écouter l'événement data qui se déclenche après chaque chargement de tuiles
    const handleData = () => {
      if (!initialSelectionAppliedRef.current) {
        applyInitialSelection();
      }
    };
    map.on("data", handleData);

    // Aussi écouter idle qui est déclenché quand la carte est complètement rendue
    const handleIdle = () => {
      if (!initialSelectionAppliedRef.current) {
        applyInitialSelection();
      }
    };
    map.on("idle", handleIdle);

    return () => {
      map.off("sourcedata", handleSourceData);
      map.off("data", handleData);
      map.off("idle", handleIdle);
    };
  }, [map, enabled, initialRnbId, initialCoordinates]);

  // Effacer la sélection
  const clearSelection = useCallback(() => {
    if (map && selectedIdRef.current) {
      clearFeatureState(map, selectedIdRef.current, "selected");
      selectedIdRef.current = null;
    }
    setSelectedBuilding(null);
    setBuildingData(null);
    setError(null);
    onBuildingSelect?.(null);
  }, [map, onBuildingSelect]);

  // Charger les données du bâtiment sélectionné
  useEffect(() => {
    if (!selectedBuilding) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getBuildingDataByRnbId(selectedBuilding.rnbId, selectedBuilding.coordinates);
        setBuildingData(data);
        onBuildingSelect?.(data);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Erreur inconnue");
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedBuilding, onBuildingSelect, onError]);

  // Gérer les événements de clic
  useEffect(() => {
    if (!map || !enabled || !enableInteractions) return;

    const handleClick = (e: maplibregl.MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;

      const rnbId = feature.id as string;
      const { lat, lng } = e.lngLat;

      // Effacer l'ancienne sélection
      if (selectedIdRef.current && selectedIdRef.current !== rnbId) {
        clearFeatureState(map, selectedIdRef.current, "selected");
      }

      // Appliquer la nouvelle sélection
      setFeatureState(map, rnbId, "selected", true);
      selectedIdRef.current = rnbId;

      setSelectedBuilding({
        rnbId,
        coordinates: { lat, lon: lng },
      });
    };

    map.on("click", LAYER_IDS.rnbPoints, handleClick);
    map.on("click", LAYER_IDS.rnbFormes, handleClick);

    return () => {
      map.off("click", LAYER_IDS.rnbPoints, handleClick);
      map.off("click", LAYER_IDS.rnbFormes, handleClick);
    };
  }, [map, enabled, enableInteractions]);

  // Gérer les événements de survol
  useEffect(() => {
    if (!map || !enabled || !enableInteractions) return;

    const handleMouseMove = (e: maplibregl.MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;

      const rnbId = feature.id as string;

      // Effacer l'ancien survol
      if (hoveredIdRef.current && hoveredIdRef.current !== rnbId) {
        clearFeatureState(map, hoveredIdRef.current, "hover");
      }

      // Appliquer le nouveau survol
      setFeatureState(map, rnbId, "hover", true);
      hoveredIdRef.current = rnbId;

      // Changer le curseur
      map.getCanvas().style.cursor = "pointer";
    };

    const handleMouseLeave = () => {
      if (hoveredIdRef.current) {
        clearFeatureState(map, hoveredIdRef.current, "hover");
        hoveredIdRef.current = null;
      }
      map.getCanvas().style.cursor = "";
    };

    map.on("mousemove", LAYER_IDS.rnbPoints, handleMouseMove);
    map.on("mouseleave", LAYER_IDS.rnbPoints, handleMouseLeave);

    return () => {
      map.off("mousemove", LAYER_IDS.rnbPoints, handleMouseMove);
      map.off("mouseleave", LAYER_IDS.rnbPoints, handleMouseLeave);
    };
  }, [map, enabled, enableInteractions]);

  return {
    selectedBuilding,
    buildingData,
    isLoading,
    error,
    clearSelection,
  };
}

/**
 * Applique un état à une feature sur les deux sources (points et formes)
 */
function setFeatureState(map: maplibregl.Map, id: string, state: "hover" | "selected", value: boolean): void {
  const stateObject = { [state]: value };

  map.setFeatureState({ source: SOURCE_IDS.rnbPoints, sourceLayer: RNB_SOURCE_LAYER, id }, stateObject);

  map.setFeatureState({ source: SOURCE_IDS.rnbFormes, sourceLayer: RNB_SOURCE_LAYER, id }, stateObject);
}

/**
 * Efface un état d'une feature sur les deux sources
 */
function clearFeatureState(map: maplibregl.Map, id: string, state: "hover" | "selected"): void {
  setFeatureState(map, id, state, false);
}
