import { describe, it, expect } from "vitest";
import { checkMaison, checkNiveaux, checkAnneeConstruction } from "./logement.rules";
import { EligibilityReason } from "../../value-objects/eligibility-reason.enum";

describe("logement.rules", () => {
  describe("checkMaison", () => {
    it("retourne passed pour une maison", () => {
      const result = checkMaison("maison");
      expect(result.passed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("retourne failed pour un appartement", () => {
      const result = checkMaison("appartement");
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.APPARTEMENT);
    });

    it("retourne failed pour undefined", () => {
      const result = checkMaison(undefined);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.APPARTEMENT);
    });
  });

  describe("checkNiveaux", () => {
    it("retourne passed pour 1 niveau", () => {
      const result = checkNiveaux(1);
      expect(result.passed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("retourne passed pour 2 niveaux (R+1)", () => {
      const result = checkNiveaux(2);
      expect(result.passed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("retourne failed pour 3 niveaux", () => {
      const result = checkNiveaux(3);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.TROP_DE_NIVEAUX);
    });

    it("retourne failed pour undefined", () => {
      const result = checkNiveaux(undefined);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.TROP_DE_NIVEAUX);
    });
  });

  describe("checkAnneeConstruction", () => {
    const anneeActuelle = new Date().getFullYear();

    it("retourne passed pour une construction de plus de 15 ans", () => {
      const annee = (anneeActuelle - 20).toString();
      const result = checkAnneeConstruction(annee);
      expect(result.passed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("retourne passed pour exactement 15 ans", () => {
      const annee = (anneeActuelle - 15).toString();
      const result = checkAnneeConstruction(annee);
      expect(result.passed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("retourne failed pour moins de 15 ans", () => {
      const annee = (anneeActuelle - 10).toString();
      const result = checkAnneeConstruction(annee);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.CONSTRUCTION_RECENTE);
    });

    it("retourne failed pour une construction récente", () => {
      const annee = (anneeActuelle - 5).toString();
      const result = checkAnneeConstruction(annee);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.CONSTRUCTION_RECENTE);
    });

    it("retourne failed pour undefined", () => {
      const result = checkAnneeConstruction(undefined);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.CONSTRUCTION_RECENTE);
    });

    it("retourne failed pour une valeur non numérique", () => {
      const result = checkAnneeConstruction("abc");
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.CONSTRUCTION_RECENTE);
    });
  });
});
