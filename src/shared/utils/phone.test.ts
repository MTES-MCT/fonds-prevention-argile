import { describe, it, expect } from "vitest";
import { normalizeFrenchPhone } from "./phone.utils";

describe("normalizeFrenchPhone", () => {
  it("retourne une chaîne vide pour les valeurs nulles ou vides", () => {
    expect(normalizeFrenchPhone(null)).toBe("");
    expect(normalizeFrenchPhone(undefined)).toBe("");
    expect(normalizeFrenchPhone("")).toBe("");
    expect(normalizeFrenchPhone("   ")).toBe("");
  });

  it("retourne tel quel un numéro déjà au format national 0XXXXXXXXX", () => {
    expect(normalizeFrenchPhone("0611223344")).toBe("0611223344");
  });

  it("retire les séparateurs courants (espaces, points, tirets, parenthèses)", () => {
    expect(normalizeFrenchPhone("06 11 22 33 44")).toBe("0611223344");
    expect(normalizeFrenchPhone("06.11.22.33.44")).toBe("0611223344");
    expect(normalizeFrenchPhone("06-11-22-33-44")).toBe("0611223344");
    expect(normalizeFrenchPhone("(06) 11 22 33 44")).toBe("0611223344");
  });

  it("convertit le préfixe international +33 en 0", () => {
    expect(normalizeFrenchPhone("+33611223344")).toBe("0611223344");
    expect(normalizeFrenchPhone("+33 6 11 22 33 44")).toBe("0611223344");
  });

  it("convertit le préfixe international 0033 en 0", () => {
    expect(normalizeFrenchPhone("0033611223344")).toBe("0611223344");
    expect(normalizeFrenchPhone("0033 6 11 22 33 44")).toBe("0611223344");
  });

  it("renvoie une chaîne vide pour les formats non reconnus", () => {
    expect(normalizeFrenchPhone("12345")).toBe("");
    expect(normalizeFrenchPhone("06112233")).toBe(""); // trop court
    expect(normalizeFrenchPhone("061122334455")).toBe(""); // trop long
    expect(normalizeFrenchPhone("not a phone")).toBe("");
  });
});
