"use client";

import { useEffect } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

import { useRgaMap } from "../hooks/useRgaMap";
import { useRgaMapMarker } from "../hooks/useRgaMapMarker";
import { useRgaBuildingSelection } from "../hooks/useRgaBuildingSelection";
import type { RgaMapProps } from "../domain/types";
import type { BuildingData } from "@/shared/services/bdnb";

interface RgaMapInternalProps extends RgaMapProps {
  onBuildingDataChange?: (data: BuildingData | null) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  padding?: string; // 🆕 Nouvelle prop
}

export function RgaMap({
  center,
  zoom,
  readOnly = false,
  showMarker = false,
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

  useRgaMapMarker({
    map,
    coordinates: center,
    showMarker,
    flyToOnMount: Boolean(center),
    zoom,
  });

  const { buildingData, isLoading } = useRgaBuildingSelection({
    map,
    enabled: !readOnly && isReady,
    onBuildingSelect,
    onError,
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
