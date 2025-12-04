"use client";

import { useEffect, useState, useRef, type RefObject } from "react";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";

import { RGA_MAP_STYLE_URL, DEFAULT_CENTER, ZOOM, MAX_BOUNDS } from "../domain/config";
import { Coordinates } from "@/shared/types";

interface UseRgaMapOptions {
  center?: Coordinates;
  zoom?: number;
}

interface UseRgaMapReturn {
  mapRef: RefObject<HTMLDivElement | null>;
  map: maplibregl.Map | null;
  isReady: boolean;
}

/**
 * Hook d'initialisation de la carte MapLibre avec le style RGA
 */
export function useRgaMap(options: UseRgaMapOptions = {}): UseRgaMapReturn {
  const { center, zoom } = options;

  const mapRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Enregistrer le protocole PMTiles
  useEffect(() => {
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);

    return () => {
      maplibregl.removeProtocol("pmtiles");
    };
  }, []);

  // Initialiser la carte
  useEffect(() => {
    if (!mapRef.current) return;

    const initialCenter: [number, number] = center ? [center.lon, center.lat] : DEFAULT_CENTER;

    const initialZoom = zoom ?? (center ? ZOOM.building : ZOOM.france);

    const newMap = new maplibregl.Map({
      container: mapRef.current,
      style: RGA_MAP_STYLE_URL,
      center: initialCenter,
      zoom: initialZoom,
      maxBounds: MAX_BOUNDS,
    });

    // Ajouter les contrôles de navigation
    newMap.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
        showZoom: true,
        showCompass: true,
      }),
      "top-right"
    );

    // Marquer la carte comme prête quand le style est chargé
    newMap.on("load", () => {
      setMap(newMap);
      setIsReady(true);
    });

    return () => {
      setMap(null);
      setIsReady(false);
      newMap.remove();
    };
  }, [center, zoom]);

  return {
    mapRef,
    map,
    isReady,
  };
}
