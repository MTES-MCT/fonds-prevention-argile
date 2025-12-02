"use client";

import { useState, useCallback } from "react";

import { RgaMap } from "./RgaMap";
import { RgaMapLegend } from "./RgaMapLegend";
import { RgaBuildingInfo } from "./RgaBuildingInfo";
import type { RgaMapProps } from "../domain/types";
import type { BuildingData } from "@/shared/services/bdnb";

interface RgaMapContainerProps extends RgaMapProps {
  showLegend?: boolean;
  showBuildingInfo?: boolean;
}

export function RgaMapContainer({
  showLegend = true,
  showBuildingInfo = true,
  onBuildingSelect,
  ...mapProps
}: RgaMapContainerProps) {
  const [buildingData, setBuildingData] = useState<BuildingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleBuildingSelect = useCallback(
    (data: BuildingData | null) => {
      onBuildingSelect?.(data);
    },
    [onBuildingSelect]
  );

  return (
    <div className="fr-mb-4w">
      <div style={{ position: "relative", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <RgaMap
          {...mapProps}
          onBuildingSelect={handleBuildingSelect}
          onBuildingDataChange={setBuildingData}
          onLoadingChange={setIsLoading}
        />
        {showLegend && (
          <div
            className="p-4"
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

      {showBuildingInfo && !mapProps.readOnly && (
        <div className="fr-mt-2w">
          {isLoading && <p className="fr-text--sm fr-text--light">Chargement des informations du bâtiment...</p>}
          {!isLoading && buildingData && <RgaBuildingInfo building={buildingData} />}
          {!isLoading && !buildingData && (
            <p className="fr-text--sm fr-text--light">Cliquez sur un bâtiment pour voir ses informations</p>
          )}
        </div>
      )}
    </div>
  );
}
