import { describe, it, expect } from "vitest";
import {
  construireLignesSimulationsDepartement,
  filtrerParPerimetre,
  regrouperSimulationsParDepartement,
  totaliserSimulations,
  versCsvSimulationsDepartement,
  type CompteurSimulations,
} from "./simulations-departement";
import type { DepartementStats } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

function stats(code: string, nom: string, simulations: number, eligibles: number): DepartementStats {
  return {
    codeDepartement: code,
    nomDepartement: nom,
    simulations,
    simulationsEligibles: eligibles,
    pourcentageEligibles: 0,
    comptesCrees: 2,
    dossiersDN: 1,
    transformationGlobale: 0,
  };
}

describe("regrouperSimulationsParDepartement", () => {
  it("fusionne les variantes d'un même code au format officiel", () => {
    const parValeur = new Map<string, CompteurSimulations>([
      ["3", { total: 4, eligible: 1, nonEligible: 3 }],
      ["03", { total: 6, eligible: 2, nonEligible: 4 }],
    ]);

    expect(regrouperSimulationsParDepartement(parValeur).get("03")).toEqual({ total: 10, eligible: 3, nonEligible: 7 });
  });

  it("écarte les valeurs qui ne sont pas un département", () => {
    const parValeur = new Map<string, CompteurSimulations>([
      ["Value not defined", { total: 50, eligible: 0, nonEligible: 50 }],
      ["2A", { total: 1, eligible: 0, nonEligible: 1 }],
      ["971", { total: 2, eligible: 0, nonEligible: 2 }],
    ]);

    expect([...regrouperSimulationsParDepartement(parValeur).keys()].sort()).toEqual(["2A", "971"]);
  });
});

describe("construireLignesSimulationsDepartement", () => {
  const lignes = construireLignesSimulationsDepartement([
    stats("75", "Paris", 10, 0),
    stats("03", "Allier", 40, 30),
    stats("13", "Bouches-du-Rhône", 10, 0),
  ]);

  it("trie par simulations décroissantes, puis par code", () => {
    expect(lignes.map((l) => l.codeDepartement)).toEqual(["03", "13", "75"]);
  });

  it("dérive les non éligibles et marque les départements pilotes", () => {
    expect(lignes[0]).toMatchObject({ pilote: true, eligibles: 30, nonEligibles: 10, pourcentageEligibles: 75 });
    expect(lignes[1]).toMatchObject({ pilote: false, nonEligibles: 10, pourcentageEligibles: 0 });
  });

  it("filtre les 11 départements pilotes ou leur complément", () => {
    expect(filtrerParPerimetre(lignes, "pilotes").map((l) => l.codeDepartement)).toEqual(["03"]);
    expect(filtrerParPerimetre(lignes, "hors-pilotes").map((l) => l.codeDepartement)).toEqual(["13", "75"]);
    expect(filtrerParPerimetre(lignes, "tous")).toHaveLength(3);
  });

  it("totalise les lignes et recalcule le taux sur le total", () => {
    expect(totaliserSimulations(lignes)).toEqual({
      simulations: 60,
      eligibles: 30,
      nonEligibles: 30,
      pourcentageEligibles: 50,
      comptesCrees: 6,
      dossiersDN: 3,
    });
  });
});

describe("versCsvSimulationsDepartement", () => {
  it("produit un CSV point-virgule avec BOM, une ligne par département", () => {
    const csv = versCsvSimulationsDepartement(construireLignesSimulationsDepartement([stats("03", "Allier", 40, 30)]));

    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.slice(1).split("\r\n")).toEqual([
      "Code département;Département;Département pilote;Simulations;Éligibles;Non éligibles;Taux d'éligibilité (%);Comptes créés;Dossiers DN créés",
      "03;Allier;Oui;40;30;10;75;2;1",
      "",
    ]);
  });

  it("protège un champ contenant le séparateur ou des guillemets", () => {
    const csv = versCsvSimulationsDepartement(construireLignesSimulationsDepartement([stats("99", 'Nom; "x"', 1, 0)]));

    expect(csv).toContain('99;"Nom; ""x""";Non;');
  });
});
