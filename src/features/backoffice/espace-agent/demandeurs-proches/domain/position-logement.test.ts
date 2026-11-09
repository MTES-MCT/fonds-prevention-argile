import { describe, expect, it } from "vitest";
import { positionDuLogement } from "./position-logement";

describe("positionDuLogement", () => {
  it("lit le point GPS du logement", () => {
    expect(positionDuLogement({ coordonnees: "46.81,1.69", commune: "36044" })).toEqual({ lat: 46.81, lon: 1.69 });
  });

  it("ne place pas un logement sans point GPS, même avec sa commune", () => {
    expect(positionDuLogement({ coordonnees: "", commune: "36044" })).toBeNull();
    expect(positionDuLogement({ commune: "36044" })).toBeNull();
    expect(positionDuLogement(undefined)).toBeNull();
  });

  it("écarte un point GPS hors des bornes terrestres", () => {
    expect(positionDuLogement({ coordonnees: "146.8,1.6" })).toBeNull();
  });
});
