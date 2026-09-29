import { describe, expect, it } from "vitest";
import type { RGASimulationData } from "@/shared/domain/types";
import {
  amosDuTerritoire,
  niveauCouverture,
  resoudreAmo,
  territoireDuParcours,
  type CouvertureDeclaree,
} from "./couverture-amo";

function amo(surcharge: Partial<CouvertureDeclaree> & { id: string }): CouvertureDeclaree {
  return { nom: surcharge.id, departements: null, communes: [], epcis: [], ...surcharge };
}

const CAMBRAI = { codeInsee: "59597", codeEpci: "200068500" };

describe("niveauCouverture", () => {
  it("retient le niveau le plus précis déclaré", () => {
    const partout = amo({ id: "a", departements: "Nord 59", epcis: ["200068500"], communes: ["59597"] });
    expect(niveauCouverture(partout, CAMBRAI)).toBe("commune");
    expect(niveauCouverture({ ...partout, communes: [] }, CAMBRAI)).toBe("epci");
    expect(niveauCouverture({ ...partout, communes: [], epcis: [] }, CAMBRAI)).toBe("departement");
  });

  it("lit le département en code, jamais par inclusion de texte", () => {
    const territoire = { codeInsee: "54395", codeEpci: null };
    expect(niveauCouverture(amo({ id: "doubs", departements: "Doubs 25, Jura 39" }), territoire)).toBeNull();
    expect(niveauCouverture(amo({ id: "siret", departements: "Siège 54000 Nancy" }), territoire)).toBeNull();
    expect(niveauCouverture(amo({ id: "mm", departements: "Meurthe-et-Moselle 54" }), territoire)).toBe("departement");
  });

  it("aligne les codes à zéro initial sur ceux de l'INSEE", () => {
    expect(
      niveauCouverture(amo({ id: "allier", departements: "Allier 03" }), { codeInsee: "03185", codeEpci: null })
    ).toBe("departement");
  });

  it("ignore l'EPCI quand le logement n'en porte pas", () => {
    expect(niveauCouverture(amo({ id: "a", epcis: ["200068500"] }), { codeInsee: "59597", codeEpci: null })).toBeNull();
  });
});

describe("amosDuTerritoire", () => {
  it("ne mélange jamais deux niveaux : l'EPCI écarte les AMO du seul département", () => {
    const amos = [
      amo({ id: "dept", departements: "Nord 59" }),
      amo({ id: "epci", departements: "Nord 59", epcis: ["200068500"] }),
    ];
    expect(amosDuTerritoire(amos, CAMBRAI).map((a) => a.id)).toEqual(["epci"]);
  });

  it("la commune prime sur l'EPCI", () => {
    const amos = [amo({ id: "epci", epcis: ["200068500"] }), amo({ id: "commune", communes: ["59597"] })];
    expect(amosDuTerritoire(amos, CAMBRAI).map((a) => a.id)).toEqual(["commune"]);
  });

  it("classe par nom puis par id, quel que soit l'ordre de lecture", () => {
    const amos = [
      amo({ id: "z", nom: "Habitat Cambrésis", epcis: ["200068500"] }),
      amo({ id: "b", nom: "Argiles du Nord", epcis: ["200068500"] }),
      amo({ id: "a", nom: "Argiles du Nord", epcis: ["200068500"] }),
    ];
    expect(amosDuTerritoire(amos, CAMBRAI).map((a) => a.id)).toEqual(["a", "b", "z"]);
    expect(amosDuTerritoire([...amos].reverse(), CAMBRAI).map((a) => a.id)).toEqual(["a", "b", "z"]);
  });

  it("renvoie une liste vide hors de toute couverture", () => {
    expect(amosDuTerritoire([amo({ id: "gers", departements: "Gers 32" })], CAMBRAI)).toEqual([]);
  });
});

describe("resoudreAmo", () => {
  it("distingue aucune, une seule et plusieurs AMO", () => {
    expect(resoudreAmo([])).toEqual({ statut: "aucune" });
    expect(resoudreAmo(["a"])).toEqual({ statut: "unique", amo: "a" });
    expect(resoudreAmo(["a", "b"])).toEqual({ statut: "plusieurs", amos: ["a", "b"] });
  });
});

describe("territoireDuParcours", () => {
  const simulation = (commune: unknown, epci: unknown) =>
    ({ logement: { commune, epci } }) as unknown as RGASimulationData;

  it("lit la simulation du demandeur avant celle de l'agent", () => {
    const territoire = territoireDuParcours({
      rgaSimulationData: simulation("59597", "200068500"),
      rgaSimulationDataAgent: simulation("36044", "243600327"),
    });
    expect(territoire).toEqual({ codeInsee: "59597", codeEpci: "200068500" });
  });

  it("se rabat sur la simulation de l'agent et normalise un code INSEE numérique", () => {
    const territoire = territoireDuParcours({ rgaSimulationData: null, rgaSimulationDataAgent: simulation(3185, "") });
    expect(territoire).toEqual({ codeInsee: "03185", codeEpci: null });
  });

  it("renvoie null sans commune exploitable", () => {
    expect(territoireDuParcours({ rgaSimulationData: null, rgaSimulationDataAgent: null })).toBeNull();
  });
});
