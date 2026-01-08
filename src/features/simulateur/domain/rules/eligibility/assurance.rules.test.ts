import { describe, it, expect } from "vitest";
import { checkAssurance } from "./assurance.rules";
import { EligibilityReason } from "../../value-objects/eligibility-reason.enum";

describe("assurance.rules", () => {
  describe("checkAssurance", () => {
    it("retourne passed si assuré", () => {
      const result = checkAssurance(true);
      expect(result.passed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("retourne failed si non assuré", () => {
      const result = checkAssurance(false);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.NON_ASSURE);
    });

    it("retourne failed pour undefined", () => {
      const result = checkAssurance(undefined);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.NON_ASSURE);
    });
  });
});
