import { describe, it, expect } from "vitest";
import { checkProprietaireOccupant } from "./proprietaire.rules";
import { EligibilityReason } from "../../value-objects/eligibility-reason.enum";

describe("proprietaire.rules", () => {
  describe("checkProprietaireOccupant", () => {
    it("retourne passed si propriétaire occupant", () => {
      const result = checkProprietaireOccupant(true);
      expect(result.passed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("retourne failed si non propriétaire occupant", () => {
      const result = checkProprietaireOccupant(false);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.NON_PROPRIETAIRE_OCCUPANT);
    });

    it("retourne failed pour undefined", () => {
      const result = checkProprietaireOccupant(undefined);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.NON_PROPRIETAIRE_OCCUPANT);
    });
  });
});
