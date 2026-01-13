import { describe, it, expect } from "vitest";
import { mapBanFeatureToAddressData } from "./ban.adapter";
import type { BanFeature } from "./ban.types";

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
