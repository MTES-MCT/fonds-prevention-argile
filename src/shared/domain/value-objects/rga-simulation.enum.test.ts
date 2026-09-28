import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isEtatSinistre, isTypeLogement, isZoneExposition } from "./rga-simulation.enum";

describe("rga-simulation.enum", () => {
  // Drizzle suit les imports du schéma : un import ici pourrait tirer du code React et casser drizzle-kit.
  it("ne contient aucun import", () => {
    const source = readFileSync(join(__dirname, "rga-simulation.enum.ts"), "utf8");
    expect(source).not.toMatch(/^\s*import\b/m);
  });

  it.each([
    [isZoneExposition, "moyen", "tres fort"],
    [isTypeLogement, "maison", "studio"],
    [isEtatSinistre, "très endommagée", "detruite"],
  ])("%o reconnaît les valeurs connues et rejette les autres", (garde, valide, invalide) => {
    expect(garde(valide)).toBe(true);
    expect(garde(invalide)).toBe(false);
    expect(garde(null)).toBe(false);
  });
});
