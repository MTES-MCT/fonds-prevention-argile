"use client";

import { useMemo } from "react";
import { useDsfrChart } from "@/shared/hooks/useDsfrChart";
import type {
  PublicStatsEvolution,
  PointEvolutionMensuelle,
} from "@/features/public-stats/domain/types/public-stats.types";

interface StatsEvolutionChartsProps {
  evolution: PublicStatsEvolution;
}

interface MiniChartProps {
  title: string;
  /** `null` = panne Matomo (à distinguer d'une série vide/sans donnée, cf. `PublicStatsEvolution`). */
  points: PointEvolutionMensuelle[] | null;
  unitTooltip: string;
  chartLoaded: boolean;
}

function MiniChart({ title, points, unitTooltip, chartLoaded }: MiniChartProps) {
  const chartData = useMemo(() => {
    if (!points || points.length === 0) return null;
    const labels = points.map((p) => `"${p.label}"`).join(", ");
    const values = points.map((p) => p.count).join(", ");
    return { x: `[[${labels}]]`, y: `[[${values}]]` };
  }, [points]);

  return (
    <div className="fr-col-12 fr-col-md-6">
      <h3 className="fr-h6 fr-mb-1w">{title}</h3>
      <div
        style={{
          backgroundColor: "var(--background-default-grey)",
          border: "1px solid var(--border-default-grey)",
        }}>
        <div className="fr-p-2w">
          {!chartData && points === null && (
            <p className="fr-text--sm fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
              Indisponible.
            </p>
          )}
          {!chartData && points !== null && (
            <p className="fr-text--sm fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
              Aucune donnée disponible.
            </p>
          )}
          {chartData && !chartLoaded && (
            <p className="fr-text--sm fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
              Chargement...
            </p>
          )}
          {chartData && chartLoaded && (
            <line-chart
              key={`${title}-${chartData.x}`}
              x={chartData.x}
              y={chartData.y}
              selected-palette="default"
              unit-tooltip={unitTooltip}
              name={`["${title}"]`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** 4 mini-graphiques d'évolution mensuelle, un par métrique — plutôt qu'un seul graphique
 * multi-courbes, pour rester lisible malgré des échelles très différentes entre métriques. */
export function StatsEvolutionCharts({ evolution }: StatsEvolutionChartsProps) {
  const chartLoaded = useDsfrChart("LineChart");

  return (
    <div className="fr-grid-row fr-grid-row--gutters">
      <MiniChart title="Visiteurs" points={evolution.visiteurs} unitTooltip="visiteurs" chartLoaded={chartLoaded} />
      <MiniChart
        title="Comptes créés"
        points={evolution.comptesCrees}
        unitTooltip="comptes"
        chartLoaded={chartLoaded}
      />
      <MiniChart
        title="Dossiers d'éligibilité déposés"
        points={evolution.dossiersEligibiliteDeposes}
        unitTooltip="dossiers"
        chartLoaded={chartLoaded}
      />
      <MiniChart
        title="Dossiers d'éligibilité validés"
        points={evolution.dossiersEligibiliteValides}
        unitTooltip="dossiers"
        chartLoaded={chartLoaded}
      />
    </div>
  );
}
