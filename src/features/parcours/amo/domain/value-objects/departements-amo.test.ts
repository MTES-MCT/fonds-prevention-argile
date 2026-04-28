import { describe, it, expect } from "vitest";
import { AmoMode, getAmoMode, isAmoAttributionAutomatique } from "./departements-amo";

describe("departements-amo", () => {
  describe("getAmoMode", () => {
    describe("AMO obligatoire (config par défaut)", () => {
      it.each([
        ["03", "Allier"],
        ["36", "Indre"],
        ["47", "Lot-et-Garonne"],
        ["54", "Meurthe-et-Moselle"],
        ["81", "Tarn"],
      ])("retourne OBLIGATOIRE pour %s (%s)", (code) => {
        expect(getAmoMode(code)).toBe(AmoMode.OBLIGATOIRE);
      });

      it("accepte le format normalisé sans zéro initial (3 → 03)", () => {
        expect(getAmoMode("3")).toBe(AmoMode.OBLIGATOIRE);
      });

      it("accepte un code numérique (number)", () => {
        expect(getAmoMode(3)).toBe(AmoMode.OBLIGATOIRE);
        expect(getAmoMode(54)).toBe(AmoMode.OBLIGATOIRE);
      });
    });

    describe("AMO facultatif (config par défaut)", () => {
      it.each([
        ["04", "Alpes-de-Haute-Provence"],
        ["24", "Dordogne"],
        ["32", "Gers"],
        ["59", "Nord (en attente validation préfecture)"],
        ["63", "Puy-de-Dôme"],
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

    describe("AV/AMO fusionnés (vide par défaut, configurable via env)", () => {
      it("aucun département en AV_AMO_FUSIONNES par défaut", () => {
        // Aucun dept ne doit être en mode AV_AMO_FUSIONNES tant que l'env var n'est pas définie
        const allCommonDepts = ["03", "04", "24", "32", "36", "47", "54", "59", "63", "75", "81", "82"];
        for (const code of allCommonDepts) {
          expect(getAmoMode(code)).not.toBe(AmoMode.AV_AMO_FUSIONNES);
        }
      });
    });
  });

  describe("isAmoAttributionAutomatique", () => {
    it("retourne true en mode OBLIGATOIRE", () => {
      expect(isAmoAttributionAutomatique("36")).toBe(true);
      expect(isAmoAttributionAutomatique("54")).toBe(true);
    });

    it("retourne false en mode FACULTATIF", () => {
      expect(isAmoAttributionAutomatique("82")).toBe(false);
      expect(isAmoAttributionAutomatique("75")).toBe(false);
      expect(isAmoAttributionAutomatique("63")).toBe(false);
    });
  });
});
