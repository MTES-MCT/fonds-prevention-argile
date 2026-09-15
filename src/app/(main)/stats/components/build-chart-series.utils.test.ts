import { describe, it, expect } from "vitest";
import { buildChartSeries, LABEL_MOIS_EN_COURS } from "./build-chart-series.utils";
import type { PointEvolutionMensuelle } from "@/features/public-stats/domain/types/public-stats.types";

function point(label: string, count: number): PointEvolutionMensuelle {
  return { label, count };
}

describe("buildChartSeries", () => {
  it("garde une série unique quand il n'y a qu'un seul point", () => {
    const result = buildChartSeries([point("sept. 2026", 10)], "Visiteurs");

    expect(JSON.parse(result.x)).toEqual([["sept. 2026"]]);
    expect(JSON.parse(result.y)).toEqual([[10]]);
    expect(JSON.parse(result.name)).toEqual(["Visiteurs"]);
    expect(result.selectedPalette).toBe("default");
  });

  it("garde une série unique quand il n'y a aucun point", () => {
    const result = buildChartSeries([], "Visiteurs");

    expect(JSON.parse(result.y)).toEqual([[]]);
    expect(JSON.parse(result.name)).toEqual(["Visiteurs"]);
  });

  it("isole le dernier point (mois en cours) dans une seconde série, en chevauchant l'avant-dernier", () => {
    const points = [point("juil. 2026", 10), point("août. 2026", 20), point("sept. 2026", 5)];

    const result = buildChartSeries(points, "Visiteurs");

    expect(JSON.parse(result.x)).toEqual([["juil. 2026", "août. 2026", "sept. 2026"]]);
    expect(JSON.parse(result.y)).toEqual([
      [10, 20, null],
      [null, 20, 5],
    ]);
    expect(JSON.parse(result.name)).toEqual(["Visiteurs", LABEL_MOIS_EN_COURS]);
    expect(result.selectedPalette).toBe("categorical");
  });

  it("fonctionne avec exactement deux points (pas d'historique avant le mois en cours)", () => {
    const points = [point("août. 2026", 20), point("sept. 2026", 5)];

    const result = buildChartSeries(points, "Comptes créés");

    expect(JSON.parse(result.y)).toEqual([
      [20, null],
      [20, 5],
    ]);
  });
});
