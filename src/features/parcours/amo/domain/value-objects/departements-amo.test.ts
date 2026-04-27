import { describe, it, expect } from "vitest";
import { AmoMode, getAmoMode, isAmoAttributionAutomatique } from "./departements-amo";

describe("departements-amo", () => {
  describe("getAmoMode", () => {
    describe("AMO obligatoire", () => {
      it.each([
        ["36", "Indre"],
        ["47", "Lot-et-Garonne"],
        ["81", "Tarn"],
      ])("retourne OBLIGATOIRE pour %s (%s)", (code) => {
        expect(getAmoMode(code)).toBe(AmoMode.OBLIGATOIRE);
      });
    });

    describe("AV/AMO fusionnés", () => {
      it.each([
        ["03", "Allier"],
        ["54", "Meurthe-et-Moselle"],
        ["63", "Puy-de-Dôme"],
      ])("retourne AV_AMO_FUSIONNES pour %s (%s)", (code) => {
        expect(getAmoMode(code)).toBe(AmoMode.AV_AMO_FUSIONNES);
      });

      it("accepte le format normalisé sans zéro initial (3 → 03)", () => {
        expect(getAmoMode("3")).toBe(AmoMode.AV_AMO_FUSIONNES);
      });

      it("accepte un code numérique (number)", () => {
        expect(getAmoMode(3)).toBe(AmoMode.AV_AMO_FUSIONNES);
        expect(getAmoMode(54)).toBe(AmoMode.AV_AMO_FUSIONNES);
      });
    });

    describe("AMO facultatif", () => {
      it.each([
        ["04", "Alpes-de-Haute-Provence"],
        ["24", "Dordogne"],
        ["32", "Gers"],
        ["59", "Nord (en attente validation préfecture)"],
        ["82", "Tarn-et-Garonne"],
      ])("retourne FACULTATIF pour les départements explicitement non obligatoires : %s (%s)", (code) => {
        expect(getAmoMode(code)).toBe(AmoMode.FACULTATIF);
      });

      it("retourne FACULTATIF par défaut pour un département non listé (75 Paris)", () => {
        expect(getAmoMode("75")).toBe(AmoMode.FACULTATIF);
      });

      it("retourne FACULTATIF pour un DOM-TOM (974 La Réunion)", () => {
        expect(getAmoMode("974")).toBe(AmoMode.FACULTATIF);
      });
    });
  });

  describe("isAmoAttributionAutomatique", () => {
    it("retourne true en mode OBLIGATOIRE", () => {
      expect(isAmoAttributionAutomatique("36")).toBe(true);
    });

    it("retourne true en mode AV_AMO_FUSIONNES", () => {
      expect(isAmoAttributionAutomatique("54")).toBe(true);
    });

    it("retourne false en mode FACULTATIF", () => {
      expect(isAmoAttributionAutomatique("82")).toBe(false);
      expect(isAmoAttributionAutomatique("75")).toBe(false);
    });
  });
});
