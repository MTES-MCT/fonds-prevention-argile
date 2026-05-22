import { describe, it, expect } from "vitest";
import { canActAsResponsable, type ActorContext } from "./responsable-permissions.service";
import type { Responsable } from "@/features/parcours/core/domain/services/responsable.service";

function makeActor(overrides: Partial<ActorContext> = {}): ActorContext {
  return {
    entrepriseAmoId: null,
    allersVersId: null,
    allersVersDepartements: [],
    ...overrides,
  };
}

describe("canActAsResponsable", () => {
  describe("responsable AMO", () => {
    const responsable: Responsable = {
      type: "AMO",
      entrepriseId: "amo-1",
      entrepriseNom: "Entreprise A",
      codeDepartement: "36",
    };

    it("autorise tout agent de la même entreprise AMO", () => {
      expect(canActAsResponsable(makeActor({ entrepriseAmoId: "amo-1" }), responsable)).toBe(true);
    });

    it("refuse un agent d'une autre entreprise AMO", () => {
      expect(canActAsResponsable(makeActor({ entrepriseAmoId: "amo-2" }), responsable)).toBe(false);
    });

    it("refuse un agent sans entreprise AMO", () => {
      expect(canActAsResponsable(makeActor(), responsable)).toBe(false);
    });
  });

  describe("responsable AV", () => {
    const responsable: Responsable = {
      type: "AV",
      structureId: "av-1",
      structureNom: "ADIL 36",
      codeDepartement: "36",
    };

    it("autorise un agent de la même structure AV", () => {
      expect(canActAsResponsable(makeActor({ allersVersId: "av-1" }), responsable)).toBe(true);
    });

    it("autorise un agent d'une autre structure AV qui couvre le département", () => {
      expect(
        canActAsResponsable(makeActor({ allersVersId: "av-2", allersVersDepartements: ["36"] }), responsable)
      ).toBe(true);
    });

    it("refuse un agent d'une structure AV hors département", () => {
      expect(
        canActAsResponsable(makeActor({ allersVersId: "av-2", allersVersDepartements: ["75"] }), responsable)
      ).toBe(false);
    });
  });

  describe("hybride AV+AMO", () => {
    it("autorise un hybride dont l'entreprise AMO correspond", () => {
      const responsable: Responsable = {
        type: "AMO",
        entrepriseId: "amo-1",
        entrepriseNom: "Entreprise A",
        codeDepartement: "36",
      };
      const actor = makeActor({
        entrepriseAmoId: "amo-1",
        allersVersId: "av-1",
        allersVersDepartements: ["36"],
      });
      expect(canActAsResponsable(actor, responsable)).toBe(true);
    });

    it("autorise un hybride dont la structure AV couvre le département (responsable AV)", () => {
      const responsable: Responsable = {
        type: "AV",
        structureId: "av-2",
        structureNom: "Autre AV",
        codeDepartement: "36",
      };
      const actor = makeActor({
        entrepriseAmoId: "amo-other",
        allersVersId: "av-1",
        allersVersDepartements: ["36"],
      });
      expect(canActAsResponsable(actor, responsable)).toBe(true);
    });
  });

  describe("autres types de responsable", () => {
    it("refuse pour DDT, MENAGE, ARCHIVE", () => {
      const actor = makeActor({ entrepriseAmoId: "amo-1", allersVersId: "av-1", allersVersDepartements: ["36"] });
      expect(canActAsResponsable(actor, { type: "DDT", codeDepartement: "36" })).toBe(false);
      expect(canActAsResponsable(actor, { type: "MENAGE", codeDepartement: "36" })).toBe(false);
      expect(canActAsResponsable(actor, { type: "ARCHIVE" })).toBe(false);
    });
  });
});
