import { describe, it, expect } from "vitest";
import { checkDepartementEligible, checkZoneForte } from "./zone-argile.rules";
import { EligibilityReason } from "../../value-objects/eligibility-reason.enum";

describe("zone-argile.rules", () => {
  describe("checkDepartementEligible", () => {
    const departementsEligibles = ["03", "04", "24", "32", "36", "47", "54", "59", "63", "81", "82"];

    it.each(departementsEligibles)("retourne passed pour le département %s", (departement) => {
      const result = checkDepartementEligible(departement);
      expect(result.passed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("retourne failed pour Paris (75)", () => {
      const result = checkDepartementEligible("75");
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.DEPARTEMENT_NON_ELIGIBLE);
    });

    it("retourne failed pour les Bouches-du-Rhône (13)", () => {
      const result = checkDepartementEligible("13");
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.DEPARTEMENT_NON_ELIGIBLE);
    });

    it("retourne failed pour undefined", () => {
      const result = checkDepartementEligible(undefined);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.DEPARTEMENT_NON_ELIGIBLE);
    });
  });

  describe("checkZoneForte", () => {
    it("retourne passed pour zone forte", () => {
      const result = checkZoneForte("fort");
      expect(result.passed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("retourne failed pour zone moyenne", () => {
      const result = checkZoneForte("moyen");
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.ZONE_NON_FORTE);
    });

    it("retourne failed pour zone faible", () => {
      const result = checkZoneForte("faible");
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.ZONE_NON_FORTE);
    });

    it("retourne failed pour undefined", () => {
      const result = checkZoneForte(undefined);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe(EligibilityReason.ZONE_NON_FORTE);
    });
  });
});
