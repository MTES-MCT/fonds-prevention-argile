import { describe, it, expect } from "vitest";
import { parseListe } from "./liste.utils";

describe("parseListe", () => {
  it("accepte la virgule et le point-virgule, y compris mélangés", () => {
    expect(parseListe("a@x.fr, b@x.fr;c@x.fr ; d@x.fr")).toEqual(["a@x.fr", "b@x.fr", "c@x.fr", "d@x.fr"]);
  });

  it("ignore les éléments vides et les séparateurs en trop", () => {
    expect(parseListe(" ;200054781,, ;200058519; ")).toEqual(["200054781", "200058519"]);
  });

  it("renvoie une liste vide pour une valeur absente", () => {
    expect(parseListe("")).toEqual([]);
    expect(parseListe(null)).toEqual([]);
    expect(parseListe(undefined)).toEqual([]);
  });
});
