import { describe, it, expect } from "vitest";
import { bearerCorrespond, safeTokenEquals } from "./crypto.utils";

const SECRET = "s3cr3t-de-trente-deux-caracteres-min";

describe("safeTokenEquals", () => {
  it("accepte deux secrets identiques", () => {
    expect(safeTokenEquals(SECRET, SECRET)).toBe(true);
  });

  // timingSafeEqual lève sur des longueurs différentes : on veut un refus, pas une exception.
  it("refuse un secret de longueur différente sans lever", () => {
    expect(safeTokenEquals("court", SECRET)).toBe(false);
  });

  it("refuse un secret de même longueur mais différent", () => {
    expect(safeTokenEquals(SECRET.replace("s", "x"), SECRET)).toBe(false);
  });
});

describe("bearerCorrespond", () => {
  it("accepte le bon token Bearer", () => {
    expect(bearerCorrespond(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it.each(["bearer", "BEARER"])("accepte le schéma en casse %s (RFC 7235)", (schema) => {
    expect(bearerCorrespond(`${schema} ${SECRET}`, SECRET)).toBe(true);
  });

  it.each([
    ["en-tête absent", null],
    ["mauvais token", "Bearer autre-token"],
    ["schéma différent", `Basic ${SECRET}`],
    ["token manquant", "Bearer"],
    ["espaces en trop", `Bearer ${SECRET} extra`],
  ])("refuse : %s", (_cas, header) => {
    expect(bearerCorrespond(header, SECRET)).toBe(false);
  });

  it.each([undefined, ""])("refuse toujours quand le secret n'est pas configuré (%s)", (secret) => {
    expect(bearerCorrespond("Bearer ", secret)).toBe(false);
    expect(bearerCorrespond(`Bearer ${SECRET}`, secret)).toBe(false);
  });
});
