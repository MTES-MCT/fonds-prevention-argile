import { describe, it, expect } from "vitest";
import { checkCatastrophesNaturelles } from "./catastrophes-naturelles.rules";
import { EligibilityReason } from "../../value-objects/eligibility-reason.enum";

describe("catastrophes-naturelles.rules", () => {
  describe("checkCatastrophesNaturelles", () => {
    it("retourne passed si pas de demande catnat en cours", () => {
      const result = checkCatastrophesNaturelles(false);
      expect(result.passed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("retourne failed si demande catnat en cours", () => {
      const result = checkCatastrophesNaturelles(true);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.DEMANDE_CATNAT_EN_COURS);
    });

    it("retourne failed pour undefined", () => {
      const result = checkCatastrophesNaturelles(undefined);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.DEMANDE_CATNAT_EN_COURS);
    });
  });
});
