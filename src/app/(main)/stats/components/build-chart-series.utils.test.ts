import { describe, it, expect } from "vitest";
import { buildChartSeries } from "./build-chart-series.utils";
import type { PointEvolutionMensuelle } from "@/features/public-stats/domain/types/public-stats.types";

function point(label: string, count: number): PointEvolutionMensuelle {
  return { label, count };
}

describe("buildChartSeries", () => {
  it("construit une série unique à partir des points", () => {
    const points = [point("juil. 2026", 10), point("août. 2026", 20)];

    const result = buildChartSeries(points, "Visiteurs");

    expect(JSON.parse(result.x)).toEqual([["juil. 2026", "août. 2026"]]);
    expect(JSON.parse(result.y)).toEqual([[10, 20]]);
    expect(JSON.parse(result.name)).toEqual(["Visiteurs"]);
    expect(result.selectedPalette).toBe("default");
  });

  it("gère l'absence de points", () => {
    const result = buildChartSeries([], "Visiteurs");

    expect(JSON.parse(result.y)).toEqual([[]]);
    expect(JSON.parse(result.name)).toEqual(["Visiteurs"]);
  });
});
