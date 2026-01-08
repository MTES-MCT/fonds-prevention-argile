"use client";

import { RgaMapContainer } from "@/features/rga-map";
import { ZOOM } from "@/features/rga-map/domain/config";
import { Coordinates } from "@/shared/types";

interface RgaMapSectionProps {
  title: string;
  centre?: Coordinates;
  zoomLevel: "departement" | "epci" | "commune";
}

const ZOOM_BY_LEVEL = {
  departement: ZOOM.departement,
  epci: ZOOM.epci,
  commune: ZOOM.commune,
} as const;

export function RgaMapSection({ title, centre, zoomLevel }: RgaMapSectionProps) {
  // Fallback si pas de coordonnées
  if (!centre) {
    return (
      <section className="fr-py-4w">
        <div className="fr-container">
          <div className="fr-p-4w" style={{ backgroundColor: "#f0f0f0", minHeight: "300px" }}>
            <p>Carte de {title} non disponible</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="fr-py-4w">
      <div className="fr-container">
        <RgaMapContainer
          center={centre}
          zoom={ZOOM_BY_LEVEL[zoomLevel]}
          readOnly
          showLegend
          showMarker
          height="400px"
        />
      </div>
    </section>
  );
}
