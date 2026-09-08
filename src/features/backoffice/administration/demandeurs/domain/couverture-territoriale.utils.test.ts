import { describe, it, expect } from "vitest";
import { estDepartementNonCouvert } from "./couverture-territoriale.utils";

const NON_COUVERTS = ["03", "47", "63", "81"];

describe("estDepartementNonCouvert", () => {
  it("reconnaît un code au format officiel", () => {
    expect(estDepartementNonCouvert("03", NON_COUVERTS)).toBe(true);
    expect(estDepartementNonCouvert("47", NON_COUVERTS)).toBe(true);
  });

  it("reconnaît un code sans zéro initial ou stocké en nombre (JSONB)", () => {
    expect(estDepartementNonCouvert("3", NON_COUVERTS)).toBe(true);
    expect(estDepartementNonCouvert(3, NON_COUVERTS)).toBe(true);
  });

  it("est faux pour un département couvert", () => {
    expect(estDepartementNonCouvert("36", NON_COUVERTS)).toBe(false);
    expect(estDepartementNonCouvert("24", NON_COUVERTS)).toBe(false);
  });

  it("est faux sans département, ou si aucun département n'est signalé", () => {
    expect(estDepartementNonCouvert(undefined, NON_COUVERTS)).toBe(false);
    expect(estDepartementNonCouvert(null, NON_COUVERTS)).toBe(false);
    expect(estDepartementNonCouvert("", NON_COUVERTS)).toBe(false);
    expect(estDepartementNonCouvert("03", [])).toBe(false);
  });
});
