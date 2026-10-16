"use client";

import { useEffect } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRgaMap, RgaMapLegend } from "@/features/rga-map";
import type { CarteCommunes, ProprietesCommune } from "@/features/backoffice/administration/demandeurs/domain";
import type { GeoContourDepartement } from "@/shared/adapters/geo";
import {
  COUCHES,
  COUCHES_DEMANDEURS,
  COUCHES_DEPARTEMENT,
  COUCHES_MASQUEES,
  OPTIONS_SOURCE,
  SOURCE_DEMANDEURS,
  SOURCE_DEPARTEMENT,
} from "./carte-demandeurs.style";

interface CarteDemandeursMapProps {
  carte: CarteCommunes;
  /** Contour du département filtré, `null` sans filtre ou tant qu'il n'est pas chargé. */
  contour: GeoContourDepartement | null;
}

const AUCUNE_FORME = { type: "FeatureCollection" as const, features: [] };

function sommetsDuContour(contour: GeoContourDepartement): [number, number][] {
  return contour.type === "Polygon" ? contour.coordinates.flat() : contour.coordinates.flat(2);
}

const COUCHES_CLIQUABLES = [COUCHES_DEMANDEURS.groupes, COUCHES_DEMANDEURS.communes];

export function CarteDemandeursMap({ carte, contour }: CarteDemandeursMapProps) {
  const { mapRef, map, isReady, webglIndisponible } = useRgaMap();

  // Couches posées une fois la carte prête ; elles disparaissent avec elle.
  useEffect(() => {
    if (!map || !isReady) return;

    for (const couche of COUCHES_MASQUEES) {
      if (map.getLayer(couche)) map.setLayoutProperty(couche, "visibility", "none");
    }
    if (!map.getSource(SOURCE_DEMANDEURS)) {
      // Le contour d'abord : les points des demandeurs restent dessus.
      map.addSource(SOURCE_DEPARTEMENT, { type: "geojson", data: AUCUNE_FORME });
      COUCHES_DEPARTEMENT.forEach((couche) => map.addLayer(couche));
      map.addSource(SOURCE_DEMANDEURS, { ...OPTIONS_SOURCE, data: AUCUNE_FORME });
      COUCHES.forEach((couche) => map.addLayer(couche));
    }

    const zoomerSurGroupe = async (e: maplibregl.MapLayerMouseEvent) => {
      const groupe = e.features?.[0];
      if (!groupe || groupe.geometry.type !== "Point") return;
      const source = map.getSource<maplibregl.GeoJSONSource>(SOURCE_DEMANDEURS);
      const zoom = await source?.getClusterExpansionZoom(groupe.properties.cluster_id as number);
      if (zoom !== undefined) map.easeTo({ center: groupe.geometry.coordinates as [number, number], zoom });
    };

    const afficherCommune = (e: maplibregl.MapLayerMouseEvent) => {
      const commune = e.features?.[0];
      if (!commune || commune.geometry.type !== "Point") return;
      const { nom, demandeurs } = commune.properties as ProprietesCommune;
      new maplibregl.Popup({ closeButton: false })
        .setLngLat(commune.geometry.coordinates as [number, number])
        .setText(`${nom} : ${demandeurs} demandeur${demandeurs > 1 ? "s" : ""}`)
        .addTo(map);
    };

    const curseurMain = () => (map.getCanvas().style.cursor = "pointer");
    const curseurDefaut = () => (map.getCanvas().style.cursor = "");

    map.on("click", COUCHES_DEMANDEURS.groupes, zoomerSurGroupe);
    map.on("click", COUCHES_DEMANDEURS.communes, afficherCommune);
    for (const couche of COUCHES_CLIQUABLES) {
      map.on("mouseenter", couche, curseurMain);
      map.on("mouseleave", couche, curseurDefaut);
    }

    return () => {
      map.off("click", COUCHES_DEMANDEURS.groupes, zoomerSurGroupe);
      map.off("click", COUCHES_DEMANDEURS.communes, afficherCommune);
      for (const couche of COUCHES_CLIQUABLES) {
        map.off("mouseenter", couche, curseurMain);
        map.off("mouseleave", couche, curseurDefaut);
      }
    };
  }, [map, isReady]);

  // Nouvelles données : on les pose et on cadre la carte sur le département filtré, sinon sur les points.
  useEffect(() => {
    if (!map || !isReady) return;
    map.getSource<maplibregl.GeoJSONSource>(SOURCE_DEMANDEURS)?.setData(carte);
    map
      .getSource<maplibregl.GeoJSONSource>(SOURCE_DEPARTEMENT)
      ?.setData(contour ? { type: "Feature", geometry: contour, properties: {} } : AUCUNE_FORME);

    const sommets = contour ? sommetsDuContour(contour) : carte.features.map((f) => f.geometry.coordinates);
    if (sommets.length === 0) return;
    const bornes = new maplibregl.LngLatBounds();
    sommets.forEach((sommet) => bornes.extend(sommet));
    map.fitBounds(bornes, { padding: 40, maxZoom: 10, duration: 500 });
  }, [map, isReady, carte, contour]);

  if (webglIndisponible) {
    return (
      <div className="fr-alert fr-alert--warning fr-alert--sm" role="alert">
        <p>
          La carte ne peut pas s&apos;afficher dans ce navigateur : il n&apos;a pas accès à l&apos;accélération
          graphique (WebGL 2). Ouvrez la page depuis un autre navigateur.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        ref={mapRef}
        style={{ height: "600px", width: "100%", borderRadius: "0.6rem", overflow: "hidden" }}
        aria-label="Carte des demandeurs par commune, sur les zones d'aléa retrait-gonflement des argiles"
        role="application"
      />
      <div className="fr-mt-2w">
        <RgaMapLegend />
      </div>
    </div>
  );
}
