import { describe, it, expect } from "vitest";
import { matchesTerritoire } from "./parcours-prevention.repository";
import type { RGASimulationData } from "@/shared/domain/types";

function makeRgaData(
  overrides: Partial<RGASimulationData["logement"]> = {}
): RGASimulationData {
  return {
    logement: {
      adresse: "1 rue de la Paix",
      code_region: "24",
      code_departement: "33",
      epci: "200000",
      commune: "33063",
      commune_nom: "Bordeaux",
      coordonnees: "44.8378,-0.5792",
      clef_ban: "33063_xxxx",
      commune_denormandie: false,
      annee_de_construction: "1990",
      rnb: "",
      niveaux: 1,
      zone_dexposition: "moyen",
      type: "maison",
      mitoyen: false,
      proprietaire_occupant: true,
      ...overrides,
    },
    taxeFonciere: { commune_eligible: true },
    rga: {
      assure: true,
      indemnise_indemnise_rga: false,
      sinistres: "endommagée",
    },
    menage: { revenu_rga: 30000, personnes: 2 },
    vous: {},
    simulatedAt: new Date().toISOString(),
  };
}

describe("matchesTerritoire", () => {
  describe("sans filtre territorial (aucun département ni EPCI)", () => {
    it("inclut un parcours avec données de localisation", () => {
      const data = makeRgaData({ code_departement: "33", epci: "200000" });
      expect(matchesTerritoire(data, [], [])).toBe(true);
    });

    it("inclut un parcours sans rgaSimulationData", () => {
      expect(matchesTerritoire(null, [], [])).toBe(true);
    });
  });

  describe("filtrage par département uniquement (pas d'EPCI dans le scope)", () => {
    it("inclut un prospect du département couvert", () => {
      const data = makeRgaData({ code_departement: "33" });
      expect(matchesTerritoire(data, ["33"], [])).toBe(true);
    });

    it("exclut un prospect d'un autre département", () => {
      const data = makeRgaData({ code_departement: "75" });
      expect(matchesTerritoire(data, ["33"], [])).toBe(false);
    });

    it("fonctionne avec plusieurs départements", () => {
      const data = makeRgaData({ code_departement: "44" });
      expect(matchesTerritoire(data, ["33", "44", "17"], [])).toBe(true);
    });

    it("exclut un parcours sans rgaSimulationData", () => {
      expect(matchesTerritoire(null, ["33"], [])).toBe(false);
    });
  });

  describe("filtrage par EPCI (cas multi Allers-Vers sur un même département)", () => {
    it("inclut un prospect dont l'EPCI correspond", () => {
      const data = makeRgaData({
        code_departement: "33",
        epci: "200001",
      });
      expect(matchesTerritoire(data, ["33"], ["200001"])).toBe(true);
    });

    it("exclut un prospect du même département mais d'un autre EPCI", () => {
      const data = makeRgaData({
        code_departement: "33",
        epci: "200002",
      });
      expect(matchesTerritoire(data, ["33"], ["200001"])).toBe(false);
    });

    it("l'EPCI est prioritaire sur le département", () => {
      // Même si le département match, si des EPCIs sont spécifiés
      // seul l'EPCI compte
      const data = makeRgaData({
        code_departement: "33",
        epci: "999999",
      });
      expect(matchesTerritoire(data, ["33"], ["200001"])).toBe(false);
    });

    it("fonctionne avec plusieurs EPCIs dans le scope", () => {
      const data = makeRgaData({
        code_departement: "33",
        epci: "200003",
      });
      expect(
        matchesTerritoire(data, ["33"], ["200001", "200002", "200003"])
      ).toBe(true);
    });

    it("exclut un prospect sans EPCI dans ses données", () => {
      const data = makeRgaData({
        code_departement: "33",
        epci: "",
      });
      expect(matchesTerritoire(data, ["33"], ["200001"])).toBe(false);
    });

    it("exclut un parcours sans rgaSimulationData", () => {
      expect(matchesTerritoire(null, ["33"], ["200001"])).toBe(false);
    });
  });

  describe("scénario réel : 2 Allers-Vers sur le même département", () => {
    const prospectEpciA = makeRgaData({
      code_departement: "33",
      epci: "243300316", // EPCI de l'Aller-vers A
    });
    const prospectEpciB = makeRgaData({
      code_departement: "33",
      epci: "243301033", // EPCI de l'Aller-vers B
    });

    it("l'agent Aller-vers A ne voit que ses prospects", () => {
      const scopeA = { departements: ["33"], epcis: ["243300316"] };

      expect(
        matchesTerritoire(prospectEpciA, scopeA.departements, scopeA.epcis)
      ).toBe(true);
      expect(
        matchesTerritoire(prospectEpciB, scopeA.departements, scopeA.epcis)
      ).toBe(false);
    });

    it("l'agent Aller-vers B ne voit que ses prospects", () => {
      const scopeB = { departements: ["33"], epcis: ["243301033"] };

      expect(
        matchesTerritoire(prospectEpciA, scopeB.departements, scopeB.epcis)
      ).toBe(false);
      expect(
        matchesTerritoire(prospectEpciB, scopeB.departements, scopeB.epcis)
      ).toBe(true);
    });
  });

  describe("filtrage par EPCI seul (sans département)", () => {
    it("inclut un prospect dont l'EPCI correspond", () => {
      const data = makeRgaData({ epci: "200001" });
      expect(matchesTerritoire(data, [], ["200001"])).toBe(true);
    });

    it("exclut un prospect dont l'EPCI ne correspond pas", () => {
      const data = makeRgaData({ epci: "200002" });
      expect(matchesTerritoire(data, [], ["200001"])).toBe(false);
    });
  });
});
