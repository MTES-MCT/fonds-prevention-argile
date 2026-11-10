import { describe, it, expect } from "vitest";
import { canActAsResponsable, type ActorContext } from "./responsable-permissions.service";
import type { Responsable } from "@/features/parcours/core/domain/services/responsable.service";

function makeActor(overrides: Partial<ActorContext> = {}): ActorContext {
  return { entrepriseAmoId: null, allersVersId: null, ...overrides };
}

function responsableAv(structureId: string, allersVersIds: string[], codeDepartement = "54"): Responsable {
  return { type: "AV", structureId, structureNom: "Aller-vers", codeDepartement, allersVersIds };
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
    it("autorise l'Aller-vers retenu pour le territoire du logement", () => {
      expect(canActAsResponsable(makeActor({ allersVersId: "av-1" }), responsableAv("av-1", ["av-1"]))).toBe(true);
    });

    it("refuse un autre Aller-vers du même département quand l'EPCI désigne le responsable", () => {
      // 54 : Soliha est retenu par l'EPCI du logement ; Alohé, qui déclare aussi le 54, n'agit pas.
      const soliha = responsableAv("av-soliha", ["av-soliha"]);
      expect(canActAsResponsable(makeActor({ allersVersId: "av-alohe" }), soliha)).toBe(false);
      expect(canActAsResponsable(makeActor({ allersVersId: "av-soliha" }), soliha)).toBe(true);
    });

    it("laisse agir tous les Aller-vers retenus à égalité, même ceux qui ne sont pas nommés", () => {
      const egalite = responsableAv("av-1", ["av-1", "av-2"]);
      expect(canActAsResponsable(makeActor({ allersVersId: "av-2" }), egalite)).toBe(true);
    });

    it("refuse un agent sans Aller-vers", () => {
      expect(canActAsResponsable(makeActor({ entrepriseAmoId: "amo-1" }), responsableAv("av-1", ["av-1"]))).toBe(false);
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
      expect(canActAsResponsable(makeActor({ entrepriseAmoId: "amo-1", allersVersId: "av-1" }), responsable)).toBe(
        true
      );
    });

    it("refuse un hybride sur un dossier Aller-vers d'un autre territoire du département", () => {
      const actor = makeActor({ entrepriseAmoId: "amo-alohe", allersVersId: "av-alohe" });
      expect(canActAsResponsable(actor, responsableAv("av-soliha", ["av-soliha"]))).toBe(false);
    });
  });

  describe("responsable INDETERMINE", () => {
    it("refuse même un agent privilégié (pas d'AV ni d'AMO résolu)", () => {
      const actor = makeActor({ entrepriseAmoId: "amo-1", allersVersId: "av-1" });
      expect(canActAsResponsable(actor, { type: "INDETERMINE" })).toBe(false);
    });
  });
});
