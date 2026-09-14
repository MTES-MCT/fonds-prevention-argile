"use client";

import { useEffect, useMemo } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

import { useRgaMap } from "../hooks/useRgaMap";
import { useRgaMapMarker } from "../hooks/useRgaMapMarker";
import { useRgaBuildingSelection } from "../hooks/useRgaBuildingSelection";
import type { RgaMapProps } from "../domain/types";
import type { BuildingData } from "@/shared/services/bdnb";
import type { Coordinates } from "@/shared/types";
import { useDelayedFlag } from "@/shared/hooks";

/** Délai avant d'afficher un indicateur de chargement, pour ne pas le faire clignoter sur un réseau performant */
const LOADING_INDICATOR_DELAY_MS = 300;

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
  onEmptyClick,
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

  const { selectedBuilding, buildingData, isLoading, layersReady } = useRgaBuildingSelection({
    map,
    // Activer le hook si readOnly ET qu'on a un initialRnbId, ou si pas readOnly/locked
    enabled: selectionEnabled,
    // Les interactions sont désactivées si readOnly ou locked
    enableInteractions: interactionsEnabled,
    initialRnbId,
    initialCoordinates: center,
    onBuildingSelect,
    onError,
    onEmptyClick,
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

  // Carte entièrement prête (style + tuiles, y compris les zones d'aléa) : sur un réseau
  // lent, le style de base peut sembler complet bien avant, ce qui donne l'impression
  // trompeuse que le clic ne fonctionne pas. Le délai évite un flash sur réseau performant.
  const mapFullyLoaded = isReady && layersReady;
  const showMapLoadingOverlay = useDelayedFlag(!mapFullyLoaded && !selectedBuilding, LOADING_INDICATOR_DELAY_MS);
  // Une fois un bâtiment cliqué, la récupération de ses données (BDNB) peut aussi prendre du
  // temps sans aucun retour visuel - même logique de délai, et prioritaire sur le message
  // "carte" puisque le clic a déjà réussi.
  const showBuildingLoadingOverlay = useDelayedFlag(isLoading, LOADING_INDICATOR_DELAY_MS);

  const overlayText = showBuildingLoadingOverlay
    ? "Récupération des informations du bâtiment..."
    : showMapLoadingOverlay
      ? "Chargement de la carte..."
      : null;

  return (
    <div style={{ padding, position: "relative" }}>
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
      {overlayText && (
        <div
          role="status"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.85)",
            borderRadius: "0.6rem",
            pointerEvents: "none",
          }}>
          <p className="fr-text--sm fr-mb-0" style={{ color: "#3a3a3a" }}>
            {overlayText}
          </p>
        </div>
      )}
    </div>
  );
}
