import { describe, it, expect } from "vitest";
import { extractDepartementFromContext, mapBanFeatureToAddressData } from "./ban.adapter";
import type { BanFeature } from "./ban.types";

describe("extractDepartementFromContext", () => {
  it("extrait le code département depuis un context BAN standard", () => {
    expect(extractDepartementFromContext("36, Indre, Centre-Val de Loire")).toBe("36");
    expect(extractDepartementFromContext("54, Meurthe-et-Moselle, Grand Est")).toBe("54");
  });

  it("extrait les codes DOM-TOM à 3 chiffres", () => {
    expect(extractDepartementFromContext("971, Guadeloupe")).toBe("971");
  });

  it("extrait les codes Corse avec lettre", () => {
    expect(extractDepartementFromContext("2A, Corse-du-Sud, Corse")).toBe("2A");
    expect(extractDepartementFromContext("2B, Haute-Corse, Corse")).toBe("2B");
  });

  it("retourne une chaîne vide pour un context vide", () => {
    expect(extractDepartementFromContext("")).toBe("");
  });

  it("gère un input numérique sans crash (défense JSONB)", () => {
    // En production, code_departement peut être un nombre dans le JSONB
    expect(extractDepartementFromContext(36 as unknown as string)).toBe("36");
    expect(extractDepartementFromContext(3 as unknown as string)).toBe("3");
    expect(extractDepartementFromContext(971 as unknown as string)).toBe("971");
  });

  it("gère null/undefined sans crash", () => {
    expect(extractDepartementFromContext(null as unknown as string)).toBe("");
    expect(extractDepartementFromContext(undefined as unknown as string)).toBe("");
  });
});

describe("mapBanFeatureToAddressData", () => {
  const mockFeature: BanFeature = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [6.1834, 48.7508] },
    properties: {
      label: "10 Rue Test, 54380 Bouxières-aux-Dames",
      score: 0.9,
      id: "54099_xxxx",
      type: "housenumber",
      name: "10 Rue Test",
      postcode: "54380",
      citycode: "54099",
      city: "Bouxières-aux-Dames",
      context: "54, Meurthe-et-Moselle, Grand Est",
    },
  };

  it("doit inclure le codeEpci quand il est fourni", () => {
    // WHEN
    const result = mapBanFeatureToAddressData(mockFeature, { codeEpci: "200069433" });

    // THEN
    expect(result.codeEpci).toBe("200069433");
  });

  it("doit avoir codeEpci undefined si non fourni", () => {
    // WHEN
    const result = mapBanFeatureToAddressData(mockFeature);

    // THEN
    expect(result.codeEpci).toBeUndefined();
  });
});
