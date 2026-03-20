import { describe, it, expect } from "vitest";
import { normalizeCodeDepartement, toOfficialCodeDepartement, getDepartementName } from "./departements.constants";

describe("normalizeCodeDepartement", () => {
  it("doit convertir un number en string sans zéro initial", () => {
    expect(normalizeCodeDepartement(3)).toBe("3");
    expect(normalizeCodeDepartement(24)).toBe("24");
    expect(normalizeCodeDepartement(59)).toBe("59");
  });

  it("doit supprimer les zéros initiaux des strings", () => {
    expect(normalizeCodeDepartement("03")).toBe("3");
    expect(normalizeCodeDepartement("04")).toBe("4");
    expect(normalizeCodeDepartement("009")).toBe("9");
  });

  it("doit laisser les codes sans zéro initial tels quels", () => {
    expect(normalizeCodeDepartement("24")).toBe("24");
    expect(normalizeCodeDepartement("59")).toBe("59");
    expect(normalizeCodeDepartement("81")).toBe("81");
  });

  it("doit préserver les codes DOM-TOM", () => {
    expect(normalizeCodeDepartement("971")).toBe("971");
    expect(normalizeCodeDepartement("976")).toBe("976");
  });

  it("doit préserver les codes Corse", () => {
    expect(normalizeCodeDepartement("2A")).toBe("2A");
    expect(normalizeCodeDepartement("2B")).toBe("2B");
  });

  it("doit gérer le edge case '0'", () => {
    expect(normalizeCodeDepartement("0")).toBe("0");
  });
});

describe("toOfficialCodeDepartement", () => {
  it("doit ajouter un zéro initial aux codes à 1 chiffre", () => {
    expect(toOfficialCodeDepartement("3")).toBe("03");
    expect(toOfficialCodeDepartement("4")).toBe("04");
    expect(toOfficialCodeDepartement("9")).toBe("09");
  });

  it("doit normaliser depuis un number puis padder", () => {
    expect(toOfficialCodeDepartement(3)).toBe("03");
    expect(toOfficialCodeDepartement(24)).toBe("24");
  });

  it("doit normaliser depuis '03' (déjà paddé)", () => {
    expect(toOfficialCodeDepartement("03")).toBe("03");
  });

  it("doit laisser les codes à 2+ chiffres tels quels", () => {
    expect(toOfficialCodeDepartement("24")).toBe("24");
    expect(toOfficialCodeDepartement("59")).toBe("59");
    expect(toOfficialCodeDepartement("81")).toBe("81");
  });

  it("doit préserver les codes DOM-TOM", () => {
    expect(toOfficialCodeDepartement("971")).toBe("971");
  });

  it("doit préserver les codes Corse", () => {
    expect(toOfficialCodeDepartement("2A")).toBe("2A");
    expect(toOfficialCodeDepartement("2B")).toBe("2B");
  });
});

describe("getDepartementName", () => {
  it("doit résoudre un code sans zéro initial", () => {
    expect(getDepartementName("3")).toBe("Allier");
    expect(getDepartementName("24")).toBe("Dordogne");
    expect(getDepartementName("59")).toBe("Nord");
  });

  it("doit résoudre un code avec zéro initial (format BAN/JSONB)", () => {
    expect(getDepartementName("03")).toBe("Allier");
    expect(getDepartementName("04")).toBe("Alpes-de-Haute-Provence");
    expect(getDepartementName("09")).toBe("Ariège");
  });

  it("doit résoudre les codes à 2 chiffres normalement", () => {
    expect(getDepartementName("81")).toBe("Tarn");
    expect(getDepartementName("82")).toBe("Tarn-et-Garonne");
    expect(getDepartementName("63")).toBe("Puy-de-Dôme");
  });

  it("doit retourner le code tel quel si non trouvé", () => {
    expect(getDepartementName("999")).toBe("999");
  });

  it("doit résoudre les codes Corse", () => {
    expect(getDepartementName("2A")).toBe("Corse-du-Sud");
    expect(getDepartementName("2B")).toBe("Haute-Corse");
  });

  it("doit résoudre les codes DOM-TOM", () => {
    expect(getDepartementName("971")).toBe("Guadeloupe");
    expect(getDepartementName("976")).toBe("Mayotte");
  });
});
