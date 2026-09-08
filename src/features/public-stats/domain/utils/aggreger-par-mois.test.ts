import { describe, it, expect } from "vitest";
import { aggregerParMois, aggregerCompteursParMois } from "./aggreger-par-mois";

describe("aggregerParMois", () => {
  it("initialise tous les mois de la plage à 0, y compris sans donnée", () => {
    const points = aggregerParMois([], new Date("2025-10-16T00:00:00Z"), new Date("2025-12-01T00:00:00Z"));
    expect(points).toEqual([
      { label: "oct. 2025", count: 0 },
      { label: "nov. 2025", count: 0 },
      { label: "déc. 2025", count: 0 },
    ]);
  });

  it("compte plusieurs dates dans le même mois", () => {
    const points = aggregerParMois(
      [new Date("2025-11-03T08:00:00Z"), new Date("2025-11-20T22:00:00Z"), new Date("2025-11-30T23:59:00Z")],
      new Date("2025-10-16T00:00:00Z"),
      new Date("2025-11-30T00:00:00Z")
    );
    expect(points).toEqual([
      { label: "oct. 2025", count: 0 },
      { label: "nov. 2025", count: 3 },
    ]);
  });

  it("ignore une date hors de la plage demandée", () => {
    const points = aggregerParMois(
      [new Date("2025-09-01T00:00:00Z")],
      new Date("2025-10-16T00:00:00Z"),
      new Date("2025-11-30T00:00:00Z")
    );
    expect(points.reduce((total, p) => total + p.count, 0)).toBe(0);
  });
});

describe("aggregerCompteursParMois", () => {
  it("agrège des compteurs déjà groupés par sous-période Matomo ('début,fin')", () => {
    const points = aggregerCompteursParMois(
      { "2025-10-01,2025-10-31": 42, "2025-11-01,2025-11-30": 58 },
      new Date("2025-10-16T00:00:00Z"),
      new Date("2025-11-30T00:00:00Z"),
      (cle) => new Date(cle.split(",")[0])
    );
    expect(points).toEqual([
      { label: "oct. 2025", count: 42 },
      { label: "nov. 2025", count: 58 },
    ]);
  });

  it("ignore une clé dont la date de début ne peut pas être extraite", () => {
    const points = aggregerCompteursParMois(
      { invalide: 10 },
      new Date("2025-10-16T00:00:00Z"),
      new Date("2025-10-31T00:00:00Z"),
      () => null
    );
    expect(points).toEqual([{ label: "oct. 2025", count: 0 }]);
  });
});
