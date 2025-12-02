"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Marker } from "maplibre-gl";

import { ZOOM, FLY_TO_DELAY, MARKER_ICON_SIZE } from "../domain/config";
import type { Coordinates } from "../domain/types";

interface UseRgaMapMarkerOptions {
  map: maplibregl.Map | null;
  coordinates?: Coordinates;
  showMarker?: boolean;
  flyToOnMount?: boolean;
}

/**
 * Hook pour gérer le marqueur et le centrage de la carte
 */
export function useRgaMapMarker(options: UseRgaMapMarkerOptions): void {
  const { map, coordinates, showMarker = false, flyToOnMount = true } = options;

  const markerRef = useRef<Marker | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!map || !coordinates) return;

    const { lat, lon } = coordinates;

    // Créer le marqueur si demandé
    if (showMarker) {
      // Supprimer l'ancien marqueur s'il existe
      if (markerRef.current) {
        markerRef.current.remove();
      }

      // Créer l'élément du marqueur
      const el = document.createElement("img");
      el.src = "/map/marker.png";
      el.style.width = `${MARKER_ICON_SIZE}px`;
      el.style.height = `${MARKER_ICON_SIZE}px`;
      el.style.cursor = "pointer";
      el.alt = "Position sélectionnée";

      // Ajouter le marqueur à la carte
      markerRef.current = new Marker({ element: el }).setLngLat([lon, lat]).addTo(map);
    }

    // Centrer la carte avec animation (après un délai)
    if (flyToOnMount) {
      timeoutRef.current = setTimeout(() => {
        map.flyTo({
          center: [lon, lat],
          zoom: ZOOM.building,
        });
      }, FLY_TO_DELAY);
    }

    return () => {
      // Nettoyer le marqueur
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }

      // Annuler le timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [map, coordinates?.lat, coordinates?.lon, showMarker, flyToOnMount]);
}

/**
 * Centrer la carte sur des coordonnées données
 */
export function flyToCoordinates(map: maplibregl.Map, coordinates: Coordinates, zoom?: number): void {
  map.flyTo({
    center: [coordinates.lon, coordinates.lat],
    zoom: zoom ?? ZOOM.building,
  });
}
