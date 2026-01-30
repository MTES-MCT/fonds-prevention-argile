"use client";

import { useEffect, useMemo } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

import { useRgaMap } from "../hooks/useRgaMap";
import { useRgaMapMarker } from "../hooks/useRgaMapMarker";
import { useRgaBuildingSelection } from "../hooks/useRgaBuildingSelection";
import type { RgaMapProps } from "../domain/types";
import type { BuildingData } from "@/shared/services/bdnb";
import type { Coordinates } from "@/shared/types";

interface RgaMapInternalProps extends RgaMapProps {
  onBuildingDataChange?: (data: BuildingData | null) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  padding?: string;
}

export function RgaMap({
  center,
  zoom,
  readOnly = false,
  locked = false,
  showMarker = false,
  initialRnbId,
  onBuildingSelect,
  onError,
  onBuildingDataChange,
  onLoadingChange,
  height = "500px",
  className = "",
  padding = "0.8rem",
}: RgaMapInternalProps) {
  const { mapRef, map, isReady } = useRgaMap({
    center,
    zoom,
  });

  const selectionEnabled = isReady && (readOnly ? Boolean(initialRnbId) : !locked);
  const interactionsEnabled = !readOnly && !locked;

  const { selectedBuilding, buildingData, isLoading } = useRgaBuildingSelection({
    map,
    // Activer le hook si readOnly ET qu'on a un initialRnbId, ou si pas readOnly/locked
    enabled: selectionEnabled,
    // Les interactions sont désactivées si readOnly ou locked
    enableInteractions: interactionsEnabled,
    initialRnbId,
    initialCoordinates: center,
    onBuildingSelect,
    onError,
  });

  // Calculer les coordonnées du marqueur : bâtiment sélectionné > coordonnées initiales
  const markerCoordinates: Coordinates | undefined = useMemo(() => {
    if (selectedBuilding) {
      return {
        lat: selectedBuilding.coordinates.lat,
        lon: selectedBuilding.coordinates.lon,
      };
    }
    return center;
  }, [selectedBuilding, center]);

  // Afficher le marqueur si demandé OU si un bâtiment est sélectionné
  const shouldShowMarker = showMarker || Boolean(selectedBuilding);

  useRgaMapMarker({
    map,
    coordinates: markerCoordinates,
    showMarker: shouldShowMarker,
    flyToOnMount: Boolean(center) && !selectedBuilding,
    zoom,
  });

  // Remonter les données au parent
  useEffect(() => {
    onBuildingDataChange?.(buildingData);
  }, [buildingData, onBuildingDataChange]);

  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  return (
    <div style={{ padding }}>
      <div
        ref={mapRef}
        className={className}
        style={{
          height,
          width: "100%",
          borderRadius: "0.6rem",
          overflow: "hidden",
        }}
        aria-label="Carte des zones d'aléa retrait-gonflement des argiles"
        role="application"
      />
    </div>
  );
}
