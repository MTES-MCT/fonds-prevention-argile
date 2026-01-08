import { describe, it, expect } from "vitest";
import { checkIndemnisation } from "./indemnisation.rules";
import { EligibilityReason } from "../../value-objects/eligibility-reason.enum";
import { MONTANT_INDEMNISATION_MAXIMUM } from "../../value-objects/simulation-constants";

describe("indemnisation.rules", () => {
  describe("checkIndemnisation", () => {
    describe("jamais indemnisé", () => {
      it("retourne passed si jamais indemnisé", () => {
        const result = checkIndemnisation({ dejaIndemnise: false });
        expect(result.passed).toBe(true);
        expect(result.reason).toBeUndefined();
      });
    });

    describe("indemnisé après le 30 juin 2025", () => {
      it("retourne failed quelque soit le montant", () => {
        const result = checkIndemnisation({
          dejaIndemnise: true,
          avantJuillet2025: false,
        });
        expect(result.passed).toBe(false);
        expect(result.reason).toBe(EligibilityReason.DEJA_INDEMNISE);
      });

      it("retourne failed même avec un montant faible", () => {
        const result = checkIndemnisation({
          dejaIndemnise: true,
          avantJuillet2025: false,
          montant: 100,
        });
        expect(result.passed).toBe(false);
        expect(result.reason).toBe(EligibilityReason.DEJA_INDEMNISE);
      });
    });

    describe("indemnisé avant le 1er juillet 2015", () => {
      it("retourne passed quelque soit le montant", () => {
        const result = checkIndemnisation({
          dejaIndemnise: true,
          avantJuillet2025: true,
          avantJuillet2015: true,
        });
        expect(result.passed).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it("retourne passed même avec un montant élevé", () => {
        const result = checkIndemnisation({
          dejaIndemnise: true,
          avantJuillet2025: true,
          avantJuillet2015: true,
          montant: 50000,
        });
        expect(result.passed).toBe(true);
        expect(result.reason).toBeUndefined();
      });
    });

    describe("indemnisé entre le 1er juillet 2015 et le 30 juin 2025", () => {
      it("retourne passed si montant inférieur au maximum", () => {
        const result = checkIndemnisation({
          dejaIndemnise: true,
          avantJuillet2025: true,
          avantJuillet2015: false,
          montant: MONTANT_INDEMNISATION_MAXIMUM - 1,
        });
        expect(result.passed).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it("retourne passed si montant égal au maximum", () => {
        const result = checkIndemnisation({
          dejaIndemnise: true,
          avantJuillet2025: true,
          avantJuillet2015: false,
          montant: MONTANT_INDEMNISATION_MAXIMUM,
        });
        expect(result.passed).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it("retourne passed si montant nul", () => {
        const result = checkIndemnisation({
          dejaIndemnise: true,
          avantJuillet2025: true,
          avantJuillet2015: false,
          montant: 0,
        });
        expect(result.passed).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it("retourne failed si montant supérieur au maximum", () => {
        const result = checkIndemnisation({
          dejaIndemnise: true,
          avantJuillet2025: true,
          avantJuillet2015: false,
          montant: MONTANT_INDEMNISATION_MAXIMUM + 1,
        });
        expect(result.passed).toBe(false);
        expect(result.reason).toBe(EligibilityReason.DEJA_INDEMNISE);
      });

      it("retourne passed si montant non spécifié (0 par défaut)", () => {
        const result = checkIndemnisation({
          dejaIndemnise: true,
          avantJuillet2025: true,
          avantJuillet2015: false,
        });
        expect(result.passed).toBe(true);
        expect(result.reason).toBeUndefined();
      });
    });

    describe("réponses partielles (pas encore répondu)", () => {
      it("retourne passed pour undefined", () => {
        const result = checkIndemnisation(undefined);
        expect(result.passed).toBe(true);
      });

      it("retourne passed si dejaIndemnise undefined", () => {
        const result = checkIndemnisation({ dejaIndemnise: undefined });
        expect(result.passed).toBe(true);
      });

      it("retourne passed si indemnisé mais avantJuillet2025 undefined", () => {
        const result = checkIndemnisation({
          dejaIndemnise: true,
          avantJuillet2025: undefined,
        });
        expect(result.passed).toBe(true);
      });

      it("retourne passed si indemnisé avant 2025 mais avantJuillet2015 undefined", () => {
        const result = checkIndemnisation({
          dejaIndemnise: true,
          avantJuillet2025: true,
          avantJuillet2015: undefined,
        });
        expect(result.passed).toBe(true);
      });
    });
  });
});
