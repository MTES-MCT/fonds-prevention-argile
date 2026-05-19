import { describe, it, expect } from "vitest";
import { parseCodesDepartement } from "./departements.utils";

describe("parseCodesDepartement", () => {
  it("extrait les codes depuis une liste textuelle", () => {
    expect(parseCodesDepartement("Indre 36, Essonne 91")).toEqual(["36", "91"]);
  });

  it("gère les codes Corse 2A/2B", () => {
    expect(parseCodesDepartement("Corse-du-Sud 2A; Haute-Corse 2B")).toEqual(["2A", "2B"]);
  });

  it("gère les DROM 971-976", () => {
    expect(parseCodesDepartement("Guadeloupe 971, La Réunion 974")).toEqual(["971", "974"]);
  });

  it("déduplique les codes répétés", () => {
    expect(parseCodesDepartement("Indre 36, encore 36")).toEqual(["36"]);
  });

  it("retourne un tableau vide pour une entrée vide ou nulle", () => {
    expect(parseCodesDepartement(null)).toEqual([]);
    expect(parseCodesDepartement(undefined)).toEqual([]);
    expect(parseCodesDepartement("")).toEqual([]);
  });

  it("ignore les nombres hors plage département", () => {
    expect(parseCodesDepartement("Code postal 36000 ; foo 99")).toEqual([]);
  });
});
