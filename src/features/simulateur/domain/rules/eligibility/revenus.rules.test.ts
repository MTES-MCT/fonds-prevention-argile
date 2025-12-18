import { describe, it, expect } from "vitest";
import { checkRevenus, getTrancheRevenus } from "./revenus.rules";
import { EligibilityReason } from "../../value-objects/eligibility-reason.enum";

describe("revenus.rules", () => {
  describe("checkRevenus", () => {
    describe("hors Île-de-France", () => {
      const codeRegion = "75"; // Nouvelle-Aquitaine

      it("retourne passed pour revenus très modestes (1 personne)", () => {
        const result = checkRevenus({
          nombrePersonnes: 1,
          revenuFiscalReference: 15000,
          codeRegion,
        });
        expect(result.passed).toBe(true);
      });

      it("retourne passed pour revenus modestes (2 personnes)", () => {
        const result = checkRevenus({
          nombrePersonnes: 2,
          revenuFiscalReference: 25000,
          codeRegion,
        });
        expect(result.passed).toBe(true);
      });

      it("retourne passed pour revenus intermédiaires (3 personnes)", () => {
        const result = checkRevenus({
          nombrePersonnes: 3,
          revenuFiscalReference: 40000,
          codeRegion,
        });
        expect(result.passed).toBe(true);
      });

      it("retourne failed pour revenus supérieurs", () => {
        const result = checkRevenus({
          nombrePersonnes: 1,
          revenuFiscalReference: 100000,
          codeRegion,
        });
        expect(result.passed).toBe(false);
        expect(result.reason).toBe(EligibilityReason.REVENUS_TROP_ELEVES);
      });
    });

    describe("Île-de-France", () => {
      const codeRegion = "11"; // Île-de-France

      it("retourne passed pour revenus très modestes IdF (1 personne)", () => {
        const result = checkRevenus({
          nombrePersonnes: 1,
          revenuFiscalReference: 20000,
          codeRegion,
        });
        expect(result.passed).toBe(true);
      });

      it("retourne passed pour revenus intermédiaires IdF (2 personnes)", () => {
        const result = checkRevenus({
          nombrePersonnes: 2,
          revenuFiscalReference: 50000,
          codeRegion,
        });
        expect(result.passed).toBe(true);
      });

      it("retourne failed pour revenus supérieurs IdF", () => {
        const result = checkRevenus({
          nombrePersonnes: 1,
          revenuFiscalReference: 150000,
          codeRegion,
        });
        expect(result.passed).toBe(false);
        expect(result.reason).toBe(EligibilityReason.REVENUS_TROP_ELEVES);
      });
    });

    it("retourne failed pour undefined", () => {
      const result = checkRevenus(undefined);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.REVENUS_TROP_ELEVES);
    });
  });

  describe("getTrancheRevenus", () => {
    it("retourne la tranche très modeste", () => {
      const tranche = getTrancheRevenus({
        nombrePersonnes: 1,
        revenuFiscalReference: 10000,
        codeRegion: "75",
      });
      expect(tranche).toBe("très modeste");
    });

    it("retourne la tranche modeste", () => {
      const tranche = getTrancheRevenus({
        nombrePersonnes: 2,
        revenuFiscalReference: 28000,
        codeRegion: "75",
      });
      expect(tranche).toBe("modeste");
    });

    it("retourne la tranche intermédiaire", () => {
      const tranche = getTrancheRevenus({
        nombrePersonnes: 3,
        revenuFiscalReference: 45000,
        codeRegion: "75",
      });
      expect(tranche).toBe("intermédiaire");
    });

    it("retourne la tranche supérieure", () => {
      const tranche = getTrancheRevenus({
        nombrePersonnes: 1,
        revenuFiscalReference: 100000,
        codeRegion: "75",
      });
      expect(tranche).toBe("supérieure");
    });
  });
});
