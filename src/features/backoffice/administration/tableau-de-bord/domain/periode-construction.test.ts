import { describe, it, expect } from "vitest";
import { periodeConstruction } from "./periode-construction";

describe("periodeConstruction", () => {
  it.each([
    ["1900", "avant_1948"],
    ["1947", "avant_1948"],
    ["1948", "1948_1974"],
    ["1974", "1948_1974"],
    ["1975", "1975_1989"],
    ["1989", "1975_1989"],
    ["1990", "depuis_1990"],
    ["2008", "depuis_1990"],
  ])("classe %s en %s", (annee, attendu) => {
    expect(periodeConstruction(annee)).toBe(attendu);
  });

  it("accepte une année stockée en nombre dans le JSONB", () => {
    expect(periodeConstruction(1962)).toBe("1948_1974");
  });

  it.each([undefined, null, "", "19", "inconnue", "1962a"])("ne classe pas %s", (valeur) => {
    expect(periodeConstruction(valeur)).toBeNull();
  });
});
