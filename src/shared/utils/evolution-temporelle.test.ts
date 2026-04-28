import { describe, it, expect } from "vitest";
import { aggregerEvolution } from "./evolution-temporelle";

describe("aggregerEvolution", () => {
  it("retourne un résultat vide en granularité jour pour un tableau vide", () => {
    expect(aggregerEvolution([])).toEqual({ points: [], granularite: "jour" });
  });

  it("groupe une seule date sur un point en granularité jour", () => {
    const result = aggregerEvolution([new Date("2026-01-15T10:00:00Z")]);
    expect(result.granularite).toBe("jour");
    expect(result.points).toEqual([{ label: "15/01", count: 1 }]);
  });

  it("compte plusieurs dates dans le même jour", () => {
    const result = aggregerEvolution([
      new Date("2026-01-15T08:00:00Z"),
      new Date("2026-01-15T14:00:00Z"),
      new Date("2026-01-15T22:00:00Z"),
    ]);
    expect(result.points).toEqual([{ label: "15/01", count: 3 }]);
  });

  it("utilise la granularité jour quand l'amplitude est <= 30 jours", () => {
    const result = aggregerEvolution([new Date("2026-01-01T00:00:00Z"), new Date("2026-01-31T00:00:00Z")]);
    expect(result.granularite).toBe("jour");
    expect(result.points).toHaveLength(31);
  });

  it("utilise la granularité semaine quand l'amplitude est > 30 jours", () => {
    const result = aggregerEvolution([new Date("2026-01-01T00:00:00Z"), new Date("2026-03-15T00:00:00Z")]);
    expect(result.granularite).toBe("semaine");
    expect(result.points.length).toBeGreaterThan(0);
  });

  it("initialise les buckets intermédiaires sans données à 0", () => {
    const result = aggregerEvolution([new Date("2026-01-01T12:00:00Z"), new Date("2026-01-04T12:00:00Z")]);
    expect(result.points).toEqual([
      { label: "01/01", count: 1 },
      { label: "02/01", count: 0 },
      { label: "03/01", count: 0 },
      { label: "04/01", count: 1 },
    ]);
  });

  it("groupe un dimanche avec le lundi précédent en granularité semaine", () => {
    // 2026-01-05 = lundi, 2026-01-11 = dimanche, 2026-02-15 = dimanche
    const result = aggregerEvolution([
      new Date("2026-01-05T12:00:00Z"), // lundi
      new Date("2026-01-11T12:00:00Z"), // dimanche -> même semaine
      new Date("2026-02-15T12:00:00Z"), // dimanche -> semaine du 09/02
    ]);
    expect(result.granularite).toBe("semaine");
    const semaineDuLundi5 = result.points.find((p) => p.label === "05/01");
    expect(semaineDuLundi5?.count).toBe(2);
    const semaineDuLundi9Fev = result.points.find((p) => p.label === "09/02");
    expect(semaineDuLundi9Fev?.count).toBe(1);
  });

  it("gère les dates traversant un changement d'année", () => {
    const result = aggregerEvolution([new Date("2025-12-15T12:00:00Z"), new Date("2026-02-10T12:00:00Z")]);
    expect(result.granularite).toBe("semaine");
    const total = result.points.reduce((sum, p) => sum + p.count, 0);
    expect(total).toBe(2);
  });

  it("retourne les points triés chronologiquement", () => {
    const result = aggregerEvolution([
      new Date("2026-01-10T12:00:00Z"),
      new Date("2026-01-01T12:00:00Z"),
      new Date("2026-01-05T12:00:00Z"),
    ]);
    const labels = result.points.map((p) => p.label);
    expect(labels[0]).toBe("01/01");
    expect(labels[labels.length - 1]).toBe("10/01");
  });
});
