"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRgaMap, RgaMapLegend } from "@/features/rga-map";
import type { CarteCommunes, ProprietesCommune } from "@/features/backoffice/administration/demandeurs/domain";
import type { GeoContourDepartement } from "@/shared/adapters/geo";
import { COUCHES_DEPARTEMENT, COUCHES_MASQUEES, SOURCE_DEPARTEMENT } from "./carte-demandeurs.style";
import { couchesCliquables, synchroniserSources } from "./sources-departements";

interface CarteDemandeursMapProps {
  carte: CarteCommunes;
  /** Contour du département filtré, `null` sans filtre ou tant qu'il n'est pas chargé. */
  contour: GeoContourDepartement | null;
}

const AUCUNE_FORME = { type: "FeatureCollection" as const, features: [] };

function sommetsDuContour(contour: GeoContourDepartement): [number, number][] {
  return contour.type === "Polygon" ? contour.coordinates.flat() : contour.coordinates.flat(2);
}

export function CarteDemandeursMap({ carte, contour }: CarteDemandeursMapProps) {
  const { mapRef, map, isReady, webglIndisponible } = useRgaMap();
  // Sources posées sur la carte en cours : elles disparaissent avec elle.
  const sourcesActives = useRef(new Set<string>());

  useEffect(() => {
    if (!map || !isReady) return;
    const actives = sourcesActives.current;

    for (const couche of COUCHES_MASQUEES) {
      if (map.getLayer(couche)) map.setLayoutProperty(couche, "visibility", "none");
    }
    // Le contour d'abord : les points des demandeurs restent dessus.
    if (!map.getSource(SOURCE_DEPARTEMENT)) {
      map.addSource(SOURCE_DEPARTEMENT, { type: "geojson", data: AUCUNE_FORME });
      COUCHES_DEPARTEMENT.forEach((couche) => map.addLayer(couche));
    }

    // Un seul gestionnaire pour toutes les sources : la liste des couches change avec les filtres.
    const auClic = async (e: maplibregl.MapMouseEvent) => {
      const couches = couchesCliquables(actives);
      if (couches.length === 0) return;
      const element = map.queryRenderedFeatures(e.point, { layers: couches })[0];
      if (!element || element.geometry.type !== "Point") return;
      const position = element.geometry.coordinates as [number, number];

      if (element.properties.cluster_id !== undefined) {
        const source = map.getSource<maplibregl.GeoJSONSource>(element.source);
        const zoom = await source?.getClusterExpansionZoom(element.properties.cluster_id as number);
        if (zoom !== undefined) map.easeTo({ center: position, zoom });
        return;
      }

      const { nom, demandeurs } = element.properties as ProprietesCommune;
      new maplibregl.Popup({ closeButton: false })
        .setLngLat(position)
        .setText(`${nom} : ${demandeurs} demandeur${demandeurs > 1 ? "s" : ""}`)
        .addTo(map);
    };

    const auSurvol = (e: maplibregl.MapMouseEvent) => {
      const couches = couchesCliquables(actives);
      const survole = couches.length > 0 && map.queryRenderedFeatures(e.point, { layers: couches }).length > 0;
      map.getCanvas().style.cursor = survole ? "pointer" : "";
    };

    map.on("click", auClic);
    map.on("mousemove", auSurvol);

    return () => {
      map.off("click", auClic);
      map.off("mousemove", auSurvol);
      actives.clear();
    };
  }, [map, isReady]);

  // Nouvelles données : on les pose et on cadre la carte sur le département filtré, sinon sur les points.
  useEffect(() => {
    if (!map || !isReady) return;
    synchroniserSources(map, carte, sourcesActives.current);
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
