import type { PointEvolutionMensuelle } from "@/features/public-stats/domain/types/public-stats.types";

export interface ChartSeries {
  x: string;
  y: string;
  name: string;
  selectedPalette: string;
}

export function buildChartSeries(points: PointEvolutionMensuelle[], title: string): ChartSeries {
  return {
    x: JSON.stringify([points.map((p) => p.label)]),
    y: JSON.stringify([points.map((p) => p.count)]),
    name: JSON.stringify([title]),
    selectedPalette: "default",
  };
}
