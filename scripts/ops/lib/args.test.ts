import { describe, it, expect } from "vitest";
import { parseNumberArg } from "./args";

describe("parseNumberArg", () => {
  it("replie sur la valeur par défaut quand l'argument est absent", () => {
    expect(parseNumberArg(undefined, 200)).toBe(200);
  });

  it("accepte un entier, un décimal et zéro", () => {
    expect(parseNumberArg("300", 200)).toBe(300);
    expect(parseNumberArg("0.5", 200)).toBe(0.5);
    expect(parseNumberArg("0", 200)).toBe(0);
  });

  it("rejette une valeur non numérique au lieu de rendre NaN", () => {
    expect(parseNumberArg("abc", 200)).toBeNull();
    expect(parseNumberArg("300ms", 200)).toBeNull();
  });

  it("rejette une valeur vide (`--sleep=`)", () => {
    expect(parseNumberArg("", 200)).toBeNull();
    expect(parseNumberArg("   ", 200)).toBeNull();
  });

  it("rejette l'infini et les valeurs sous le minimum", () => {
    expect(parseNumberArg("Infinity", 200)).toBeNull();
    expect(parseNumberArg("-5", 200)).toBeNull();
    expect(parseNumberArg("2", 200, 10)).toBeNull();
  });
});
