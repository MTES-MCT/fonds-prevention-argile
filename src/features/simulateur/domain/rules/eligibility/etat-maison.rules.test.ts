import { describe, it, expect } from "vitest";
import { checkEtatMaison } from "./etat-maison.rules";
import { EligibilityReason } from "../../value-objects/eligibility-reason.enum";

describe("etat-maison.rules", () => {
  describe("checkEtatMaison", () => {
    it("retourne passed pour une maison saine", () => {
      const result = checkEtatMaison("saine");
      expect(result.passed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("retourne passed pour une maison très peu endommagée", () => {
      const result = checkEtatMaison("très peu endommagée");
      expect(result.passed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("retourne failed pour une maison endommagée", () => {
      const result = checkEtatMaison("endommagée");
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.MAISON_ENDOMMAGEE);
    });

    it("retourne failed pour undefined", () => {
      const result = checkEtatMaison(undefined);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.MAISON_ENDOMMAGEE);
    });
  });
});
