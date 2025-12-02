"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type maplibregl from "maplibre-gl";

import { SOURCE_IDS, LAYER_IDS, RNB_SOURCE_LAYER } from "../domain/config";
import type { SelectedBuilding } from "../domain/types";
import { getBuildingDataByRnbId, type BuildingData } from "@/shared/services/bdnb";

interface UseRgaBuildingSelectionOptions {
  map: maplibregl.Map | null;
  enabled?: boolean;
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
  const { map, enabled = true, onBuildingSelect, onError } = options;

  const [selectedBuilding, setSelectedBuilding] = useState<SelectedBuilding | null>(null);
  const [buildingData, setBuildingData] = useState<BuildingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const hoveredIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);

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
    if (!map || !enabled) return;

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
  }, [map, enabled]);

  // Gérer les événements de survol
  useEffect(() => {
    if (!map || !enabled) return;

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
  }, [map, enabled]);

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
