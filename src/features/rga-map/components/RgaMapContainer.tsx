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
  onCarteIndisponible,
  ...mapProps
}: RgaMapContainerProps) {
  const [, setBuildingData] = useState<BuildingData | null>(null);
  const [, setIsLoading] = useState(false);
  const [carteIndisponible, setCarteIndisponible] = useState(false);

  const handleBuildingSelect = useCallback(
    (data: BuildingData | null) => {
      onBuildingSelect?.(data);
    },
    [onBuildingSelect]
  );

  const handleCarteIndisponible = useCallback(() => {
    setCarteIndisponible(true);
    onCarteIndisponible?.();
  }, [onCarteIndisponible]);

  const containerStyle =
    variant === "default"
      ? { position: "relative" as const, borderRadius: "0.6rem", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }
      : { position: "relative" as const };

  return (
    <div style={containerStyle}>
      <RgaMap
        {...mapProps}
        onBuildingSelect={handleBuildingSelect}
        onCarteIndisponible={handleCarteIndisponible}
        onBuildingDataChange={setBuildingData}
        onLoadingChange={setIsLoading}
      />
      {/* Une légende sans carte n'explique plus rien. */}
      {showLegend && !carteIndisponible && (
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
  );
}
