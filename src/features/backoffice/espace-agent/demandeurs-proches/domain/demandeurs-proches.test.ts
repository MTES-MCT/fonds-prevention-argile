import { describe, expect, it } from "vitest";
import { formaterDistance, plusProches } from "./demandeurs-proches";

const ORIGINE = { lat: 46.81, lon: 1.69 };

function candidat(nom: string, lat: number) {
  return { nom, position: { lat, lon: 1.69 }, donnees: nom };
}

describe("plusProches", () => {
  it("trie par distance et garde le nombre demandé", () => {
    const voisins = plusProches(ORIGINE, [candidat("Loin", 47.5), candidat("Près", 46.82), candidat("Moyen", 46.9)], 2);

    expect(voisins.map((v) => v.nom)).toEqual(["Près", "Moyen"]);
    expect(voisins[0].distanceKm).toBeCloseTo(1.11, 1);
  });

  it("départage deux voisins à la même distance par leur nom", () => {
    const voisins = plusProches(ORIGINE, [candidat("Zoé", 46.82), candidat("Ève", 46.82)], 5);

    expect(voisins.map((v) => v.nom)).toEqual(["Ève", "Zoé"]);
  });

  it("rend moins de voisins qu'il n'en est demandé quand il n'y en a pas assez", () => {
    expect(plusProches(ORIGINE, [candidat("Seul", 46.82)], 5)).toHaveLength(1);
    expect(plusProches(ORIGINE, [], 5)).toEqual([]);
  });
});

describe("formaterDistance", () => {
  it.each([
    [0.4, "moins d'1 km"],
    [4.13, "4,1 km"],
    [9.96, "10 km"],
    [23.4, "23 km"],
  ])("affiche %s km comme « %s »", (km, attendu) => {
    expect(formaterDistance(km)).toBe(attendu);
  });
});
