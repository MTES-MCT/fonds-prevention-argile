"use client";

import { useEffect, useState, useRef, type RefObject } from "react";
import * as maplibregl from "maplibre-gl";
import { Protocol, PMTiles } from "pmtiles";

import { RGA_MAP_STYLE_URL, ARGILE_PMTILES_URL, DEFAULT_CENTER, ZOOM, MAX_BOUNDS } from "../domain/config";
import { webgl2EstDisponible } from "../domain/webgl";
import { Coordinates } from "@/shared/types";

interface UseRgaMapOptions {
  center?: Coordinates;
  zoom?: number;
}

interface UseRgaMapReturn {
  mapRef: RefObject<HTMLDivElement | null>;
  map: maplibregl.Map | null;
  isReady: boolean;
  /** WebGL2 absent : aucune carte ne s'affichera, il faut proposer une autre voie. */
  webglIndisponible: boolean;
}

/**
 * Hook d'initialisation de la carte MapLibre avec le style RGA
 */
export function useRgaMap(options: UseRgaMapOptions = {}): UseRgaMapReturn {
  const { center, zoom } = options;

  const mapRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [isReady, setIsReady] = useState(false);
  // Faux au premier rendu des deux côtés : la détection a besoin du navigateur, la poser
  // dès l'état initial provoquerait une divergence d'hydratation.
  const [webglIndisponible, setWebglIndisponible] = useState(false);

  // Extraire les valeurs primitives pour éviter les re-renders
  const centerLat = center?.lat;
  const centerLon = center?.lon;

  // Enregistrer le protocole PMTiles, et préchauffer l'en-tête + répertoire racine du fichier
  // argile en parallèle du chargement du style : sur un réseau lent, cet aller-retour (~1 par
  // requête non cachée) ne bloque plus la première tuile demandée une fois la carte affichée.
  useEffect(() => {
    // maplibre 6 resout son worker via import.meta.url, qui pointe le chunk webpack : 404.
    // Le fichier est copie dans public/ au postinstall (scripts/setup/copy-maplibre-worker.mjs).
    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);

    const argile = new PMTiles(ARGILE_PMTILES_URL);
    protocol.add(argile);
    argile.getHeader().catch(() => {});

    return () => {
      maplibregl.removeProtocol("pmtiles");
    };
  }, []);

  // Initialiser la carte (une seule fois)
  useEffect(() => {
    if (!mapRef.current) return;

    // maplibre 6 n'échoue plus bruyamment sans WebGL2 : il construit une carte sans peintre,
    // muette, dont le remove() lève et emporte la page entière. Ne rien instancier plutôt.
    if (!webgl2EstDisponible()) {
      setWebglIndisponible(true);
      return;
    }

    const initialCenter: [number, number] =
      centerLon !== undefined && centerLat !== undefined ? [centerLon, centerLat] : DEFAULT_CENTER;

    const initialZoom = zoom ?? (centerLat !== undefined ? ZOOM.building : ZOOM.france);

    const newMap = new maplibregl.Map({
      container: mapRef.current,
      style: RGA_MAP_STYLE_URL,
      center: initialCenter,
      zoom: initialZoom,
      maxBounds: MAX_BOUNDS,
      attributionControl: false,
    });

    // Ajouter les contrôles de navigation
    newMap.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
        showZoom: true,
        showCompass: false,
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
      try {
        newMap.remove();
      } catch (error) {
        // Ceinture : le peintre peut aussi disparaître après coup (perte de contexte WebGL),
        // et l'échec d'une destruction ne doit jamais faire tomber le rendu.
        console.error("[RgaMap] Destruction de la carte impossible:", error);
      }
    };
  }, [centerLat, centerLon, zoom]);

  return {
    mapRef,
    map,
    isReady,
    webglIndisponible,
  };
}
