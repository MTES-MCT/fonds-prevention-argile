import { describe, it, expect } from "vitest";
import { checkNonMitoyen } from "./mitoyennete.rules";
import { EligibilityReason } from "../../value-objects/eligibility-reason.enum";

describe("mitoyennete.rules", () => {
  describe("checkNonMitoyen", () => {
    it("retourne passed pour une maison non mitoyenne", () => {
      const result = checkNonMitoyen(false);
      expect(result.passed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("retourne failed pour une maison mitoyenne", () => {
      const result = checkNonMitoyen(true);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.MAISON_MITOYENNE);
    });

    it("retourne failed pour undefined", () => {
      const result = checkNonMitoyen(undefined);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.MAISON_MITOYENNE);
    });
  });
});
