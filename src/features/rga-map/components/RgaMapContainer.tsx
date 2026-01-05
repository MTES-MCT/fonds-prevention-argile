"use client";

import { useState, useCallback } from "react";

import { RgaMap } from "./RgaMap";
import { RgaMapLegend } from "./RgaMapLegend";
import type { RgaMapProps } from "../domain/types";
import type { BuildingData } from "@/shared/services/bdnb";

interface RgaMapContainerProps extends RgaMapProps {
  showLegend?: boolean;
  /** Style minimal (sans ombre/bordure) pour intégration dans un formulaire */
  variant?: "default" | "minimal";
}

export function RgaMapContainer({
  showLegend = true,
  variant = "default",
  onBuildingSelect,
  ...mapProps
}: RgaMapContainerProps) {
  const [, setBuildingData] = useState<BuildingData | null>(null);
  const [, setIsLoading] = useState(false);

  const handleBuildingSelect = useCallback(
    (data: BuildingData | null) => {
      onBuildingSelect?.(data);
    },
    [onBuildingSelect]
  );

  const containerStyle =
    variant === "default"
      ? { position: "relative" as const, borderRadius: "0.6rem", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }
      : { position: "relative" as const };

  return (
    <div className="fr-mb-4w ">
      <div style={containerStyle}>
        <RgaMap
          {...mapProps}
          onBuildingSelect={handleBuildingSelect}
          onBuildingDataChange={setBuildingData}
          onLoadingChange={setIsLoading}
        />
        {showLegend && (
          <div
            className="px-4 pb-4"
            style={{
              bottom: "0",
              left: "0",
              right: "0",
              zIndex: 10,
            }}>
            <RgaMapLegend />
          </div>
        )}
      </div>
    </div>
  );
}
