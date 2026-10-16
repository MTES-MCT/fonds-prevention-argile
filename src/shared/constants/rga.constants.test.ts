import { describe, expect, it } from "vitest";
import { comparerDepartementsFondsEnTete, DEPARTEMENTS_ELIGIBLES_RGA } from "./rga.constants";

describe("comparerDepartementsFondsEnTete", () => {
  it("place les 11 départements du fonds en tête, dans l'ordre du dispositif, puis les autres par code", () => {
    const melanges = ["82", "63", "1", "3", "04", "2A", "36", "54", "24", "13", "47", "974", "81", "59", "32"];

    expect(melanges.sort(comparerDepartementsFondsEnTete)).toEqual([
      "3",
      "04",
      "24",
      "32",
      "36",
      "47",
      "54",
      "59",
      "63",
      "81",
      "82",
      "1",
      "13",
      "2A",
      "974",
    ]);
  });

  it("garde la liste du fonds dans l'ordre annoncé", () => {
    expect(DEPARTEMENTS_ELIGIBLES_RGA).toEqual(["03", "04", "24", "32", "36", "47", "54", "59", "63", "81", "82"]);
  });
});
