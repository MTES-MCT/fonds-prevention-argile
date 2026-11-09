"use client";

import { useEffect } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRgaMap } from "@/features/rga-map";
import { LAYER_IDS } from "@/features/rga-map/domain/config";
import type { DemandeurProche } from "@/features/backoffice/espace-agent/demandeurs-proches/services/demandeurs-proches.service";
import type { PositionLogement } from "@/features/backoffice/espace-agent/demandeurs-proches/domain";

// Seuls les points comptent ici : bâtiments et zones d'argile brouilleraient la lecture des distances.
const COUCHES_MASQUEES = [LAYER_IDS.rnbPoints, LAYER_IDS.rnbFormes, LAYER_IDS.zonesArgile];
const ZOOM_MAX_CADRAGE = 13;

export type VoisinSurCarte = Pick<
  DemandeurProche,
  "rang" | "nom" | "etape" | "lat" | "lon" | "positionApproximative" | "href"
>;

interface CarteDemandeursProchesMapProps {
  origine: PositionLogement;
  voisins: VoisinSurCarte[];
}

function pastille(contenu: string, styles: Partial<CSSStyleDeclaration>): HTMLElement {
  const element = document.createElement("span");
  element.textContent = contenu;
  Object.assign(element.style, {
    width: "1.75rem",
    height: "1.75rem",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "0.875rem",
    boxShadow: "0 0 0 2px var(--background-default-grey)",
    ...styles,
  });
  return element;
}

function marqueurVoisin(voisin: VoisinSurCarte): HTMLElement {
  const element = pastille(
    String(voisin.rang),
    voisin.positionApproximative
      ? {
          background: "var(--background-default-grey)",
          color: "var(--text-action-high-blue-france)",
          border: "2px dashed var(--border-action-high-blue-france)",
          cursor: "pointer",
        }
      : {
          background: "var(--background-action-high-blue-france)",
          color: "var(--text-inverted-blue-france)",
          cursor: "pointer",
        }
  );
  element.setAttribute("role", "button");
  element.setAttribute("tabindex", "0");
  element.setAttribute("aria-label", `${voisin.rang}. ${voisin.nom}, ${voisin.etape}`);
  return element;
}

function marqueurOrigine(): HTMLElement {
  const element = pastille("", {
    width: "2rem",
    height: "2rem",
    background: "var(--background-action-high-grey)",
    color: "var(--text-inverted-grey)",
  });
  element.className = "fr-icon-home-4-fill fr-icon--sm";
  element.setAttribute("role", "img");
  element.setAttribute("aria-label", "Logement de ce dossier");
  return element;
}

// Construit en nœuds texte : les noms viennent des demandeurs, rien n'est interprété comme du HTML.
function contenuBulle(voisin: VoisinSurCarte): HTMLElement {
  const bloc = document.createElement("div");
  const nom = document.createElement("p");
  nom.className = "fr-text--bold fr-text--sm fr-mb-0";
  nom.textContent = `${voisin.rang}. ${voisin.nom}`;
  const etape = document.createElement("p");
  etape.className = "fr-text--xs fr-mb-1v";
  etape.textContent = voisin.etape;
  const lien = document.createElement("a");
  lien.className = "fr-link fr-link--sm";
  lien.href = voisin.href;
  lien.target = "_blank";
  lien.rel = "noopener";
  lien.title = `Ouvrir le dossier de ${voisin.nom} - nouvelle fenêtre`;
  lien.textContent = "Ouvrir le dossier";
  bloc.append(nom, etape, lien);
  return bloc;
}

export function CarteDemandeursProchesMap({ origine, voisins }: CarteDemandeursProchesMapProps) {
  const { mapRef, map, isReady, webglIndisponible } = useRgaMap({ center: origine, zoom: 10 });

  useEffect(() => {
    if (!map || !isReady) return;

    for (const couche of COUCHES_MASQUEES) {
      if (map.getLayer(couche)) map.setLayoutProperty(couche, "visibility", "none");
    }

    const marqueurs = [new maplibregl.Marker({ element: marqueurOrigine() }).setLngLat([origine.lon, origine.lat])];
    for (const voisin of voisins) {
      const element = marqueurVoisin(voisin);
      const bulle = new maplibregl.Popup({ offset: 18, closeButton: true }).setDOMContent(contenuBulle(voisin));
      element.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          element.click();
        }
      });
      marqueurs.push(new maplibregl.Marker({ element }).setLngLat([voisin.lon, voisin.lat]).setPopup(bulle));
    }
    marqueurs.forEach((marqueur) => marqueur.addTo(map));

    const bornes = new maplibregl.LngLatBounds([origine.lon, origine.lat], [origine.lon, origine.lat]);
    voisins.forEach((voisin) => bornes.extend([voisin.lon, voisin.lat]));
    map.fitBounds(bornes, { padding: 48, maxZoom: ZOOM_MAX_CADRAGE, duration: 0 });

    return () => marqueurs.forEach((marqueur) => marqueur.remove());
  }, [map, isReady, origine, voisins]);

  if (webglIndisponible) {
    return (
      <div className="fr-alert fr-alert--info fr-alert--sm">
        <p>
          La carte ne peut pas s&apos;afficher dans ce navigateur : il n&apos;a pas accès à l&apos;accélération
          graphique (WebGL 2). La liste donne les mêmes dossiers.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      style={{ height: "22rem", width: "100%", borderRadius: "0.5rem", overflow: "hidden" }}
      role="region"
      aria-label="Carte du logement de ce dossier et des demandeurs proches, numérotés comme dans la liste"
    />
  );
}
