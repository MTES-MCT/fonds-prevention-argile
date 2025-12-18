import { describe, it, expect } from "vitest";
import { checkIndemnisation } from "./indemnisation.rules";
import { EligibilityReason } from "../../value-objects/eligibility-reason.enum";
import { MONTANT_INDEMNISATION_MAXIMUM } from "../../value-objects/simulation-constants";

describe("indemnisation.rules", () => {
  describe("checkIndemnisation", () => {
    it("retourne passed si jamais indemnisé", () => {
      const result = checkIndemnisation({ dejaIndemnise: false });
      expect(result.passed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("retourne passed si indemnisé avec montant inférieur au maximum", () => {
      const result = checkIndemnisation({
        dejaIndemnise: true,
        montant: MONTANT_INDEMNISATION_MAXIMUM - 1,
      });
      expect(result.passed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("retourne passed si indemnisé avec montant nul", () => {
      const result = checkIndemnisation({
        dejaIndemnise: true,
        montant: 0,
      });
      expect(result.passed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("retourne failed si indemnisé avec montant égal au maximum", () => {
      const result = checkIndemnisation({
        dejaIndemnise: true,
        montant: MONTANT_INDEMNISATION_MAXIMUM,
      });
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.DEJA_INDEMNISE);
    });

    it("retourne failed si indemnisé avec montant supérieur au maximum", () => {
      const result = checkIndemnisation({
        dejaIndemnise: true,
        montant: MONTANT_INDEMNISATION_MAXIMUM + 5000,
      });
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.DEJA_INDEMNISE);
    });

    it("retourne passed pour undefined (pas encore répondu)", () => {
      const result = checkIndemnisation(undefined);
      expect(result.passed).toBe(true);
    });

    it("retourne passed si indemnisé sans montant spécifié (montant 0 par défaut)", () => {
      const result = checkIndemnisation({
        dejaIndemnise: true,
      });
      expect(result.passed).toBe(true);
    });
  });
});
