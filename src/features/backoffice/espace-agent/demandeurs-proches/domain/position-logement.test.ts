import { describe, expect, it } from "vitest";
import { communeSansPointGps, positionDuLogement } from "./position-logement";

const CENTRES = { "36044": [1.6903, 46.8023] as [number, number], "03023": [3.3, 46.5] as [number, number] };

describe("positionDuLogement", () => {
  it("prend le point GPS quand il existe", () => {
    expect(positionDuLogement({ coordonnees: "46.81,1.69", commune: "36044" }, CENTRES)).toEqual({
      lat: 46.81,
      lon: 1.69,
      approximative: false,
    });
  });

  it("se replie sur le centre de la commune, signalé approximatif", () => {
    expect(positionDuLogement({ coordonnees: "", commune: "36044" }, CENTRES)).toEqual({
      lat: 46.8023,
      lon: 1.6903,
      approximative: true,
    });
  });

  it("retrouve une commune stockée en nombre, sans son zéro de tête", () => {
    expect(positionDuLogement({ commune: 3023 as unknown as string }, CENTRES)).toMatchObject({ lat: 46.5 });
  });

  it("écarte un point GPS hors des bornes terrestres", () => {
    expect(positionDuLogement({ coordonnees: "146.8,1.6", commune: "36044" }, CENTRES)?.approximative).toBe(true);
  });

  it("ne place rien sans point GPS ni centre de commune connu", () => {
    expect(positionDuLogement({ coordonnees: "", commune: "36999" }, CENTRES)).toBeNull();
    expect(positionDuLogement(undefined, CENTRES)).toBeNull();
  });
});

describe("communeSansPointGps", () => {
  it("ne demande un centre de commune que faute de point GPS", () => {
    expect(communeSansPointGps({ coordonnees: "46.81,1.69", commune: "36044" })).toBeNull();
    expect(communeSansPointGps({ coordonnees: "", commune: "36044" })).toBe("36044");
  });
});
