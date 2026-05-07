import { describe, it, expect } from "vitest";
import { detectPartnerFromReferrer, normalizePartnerSlug, resolvePartner } from "./partner-detection";

describe("partner-detection", () => {
  describe("detectPartnerFromReferrer", () => {
    it("retourne 'maif' pour le host MAIF", () => {
      expect(detectPartnerFromReferrer("https://auxalentours.maif.fr/")).toBe("maif");
      expect(detectPartnerFromReferrer("https://auxalentours.maif.fr/page?x=1")).toBe("maif");
    });

    it("ignore le casing du host", () => {
      expect(detectPartnerFromReferrer("https://Auxalentours.MAIF.fr/")).toBe("maif");
    });

    it("retourne null pour un referrer inconnu", () => {
      expect(detectPartnerFromReferrer("https://google.com/")).toBeNull();
    });

    it("retourne null pour un referrer vide ou invalide", () => {
      expect(detectPartnerFromReferrer("")).toBeNull();
      expect(detectPartnerFromReferrer(null)).toBeNull();
      expect(detectPartnerFromReferrer(undefined)).toBeNull();
      expect(detectPartnerFromReferrer("not-a-url")).toBeNull();
    });
  });

  describe("normalizePartnerSlug", () => {
    it("accepte un slug connu", () => {
      expect(normalizePartnerSlug("maif")).toBe("maif");
      expect(normalizePartnerSlug("MAIF")).toBe("maif");
      expect(normalizePartnerSlug("  maif  ")).toBe("maif");
    });

    it("rejette un slug inconnu", () => {
      expect(normalizePartnerSlug("unknown")).toBeNull();
      expect(normalizePartnerSlug("")).toBeNull();
      expect(normalizePartnerSlug(null)).toBeNull();
    });
  });

  describe("resolvePartner", () => {
    it("priorise le param URL sur le referrer", () => {
      expect(resolvePartner("maif", "https://google.com/")).toBe("maif");
    });

    it("retombe sur le referrer si pas de param URL", () => {
      expect(resolvePartner(null, "https://auxalentours.maif.fr/")).toBe("maif");
    });

    it("ignore un param URL inconnu et utilise le referrer", () => {
      expect(resolvePartner("unknown", "https://auxalentours.maif.fr/")).toBe("maif");
    });

    it("retourne null si aucune source ne matche", () => {
      expect(resolvePartner(null, null)).toBeNull();
      expect(resolvePartner("", "")).toBeNull();
      expect(resolvePartner("unknown", "https://google.com/")).toBeNull();
    });
  });
});
