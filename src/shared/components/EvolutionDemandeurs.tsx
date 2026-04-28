"use client";

import { useMemo } from "react";
import { useDsfrChart } from "@/shared/hooks/useDsfrChart";
import type { EvolutionDemandeurs as EvolutionDemandeursType } from "@/shared/utils/evolution-temporelle";

interface EvolutionDemandeursProps {
  evolution: EvolutionDemandeursType;
}

export function EvolutionDemandeurs({ evolution }: EvolutionDemandeursProps) {
  const chartLoaded = useDsfrChart("LineChart");

  const chartData = useMemo(() => {
    if (evolution.points.length === 0) return null;

    const labels = evolution.points.map((p) => `"${p.label}"`).join(", ");
    const values = evolution.points.map((p) => p.count).join(", ");

    return {
      x: `[[${labels}]]`,
      y: `[[${values}]]`,
    };
  }, [evolution.points]);

  const sousTitre =
    evolution.granularite === "jour"
      ? "Nombre de demandeurs créés par jour"
      : "Nombre de demandeurs créés par semaine (lundi)";

  return (
    <div className="fr-mb-6w">
      <h2 className="fr-h4 fr-mb-1w">Évolution des demandeurs</h2>
      <p className="fr-text-mention--grey fr-mb-3w">{sousTitre}</p>

      <div
        style={{
          backgroundColor: "var(--background-default-grey)",
          border: "1px solid var(--border-default-grey)",
        }}>
        <div className="fr-p-2w">
          {!chartData && (
            <p className="fr-text--sm" style={{ color: "var(--text-mention-grey)" }}>
              Aucune donnée disponible.
            </p>
          )}
          {chartData && !chartLoaded && (
            <p className="fr-text--sm" style={{ color: "var(--text-mention-grey)" }}>
              Chargement...
            </p>
          )}
          {chartData && chartLoaded && (
            <line-chart
              key={chartData.x}
              x={chartData.x}
              y={chartData.y}
              selected-palette="default"
              unit-tooltip="demandeurs"
              name='["Demandeurs"]'
            />
          )}
        </div>
      </div>
    </div>
  );
}
