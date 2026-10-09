import { describe, it, expect } from "vitest";
import {
  construireLignesSimulationsDepartement,
  filtrerParPerimetre,
  regrouperSimulationsParDepartement,
  repartitionPilotes,
  totaliserSimulations,
  totalDepuisEntonnoir,
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

describe("repartitionPilotes", () => {
  it("donne la part des visites hors des départements pilotes, calculée sur toutes les lignes", () => {
    const lignes = construireLignesSimulationsDepartement([
      stats("54", "Meurthe-et-Moselle", 5155, 0),
      stats("75", "Paris", 3000, 0),
      stats("13", "Bouches-du-Rhône", 91, 0),
    ]);

    expect(repartitionPilotes(lignes)).toEqual({
      pilotes: 5155,
      horsPilotes: 3091,
      partPilotes: 63,
      partHorsPilotes: 37,
    });
  });

  it("arrondit la part hors pilotes et en déduit l'autre, pour que les deux fassent toujours 100", () => {
    // 1 hors pilote sur 8 : 12,5 % arrondi à 13, donc 87 pour les pilotes et non 88.
    const lignes = construireLignesSimulationsDepartement([stats("03", "Allier", 7, 0), stats("75", "Paris", 1, 0)]);

    const repartition = repartitionPilotes(lignes);

    expect(repartition).toMatchObject({ partPilotes: 87, partHorsPilotes: 13 });
    expect((repartition?.partPilotes ?? 0) + (repartition?.partHorsPilotes ?? 0)).toBe(100);
  });

  it("couvre les cas extrêmes sans diviser par zéro", () => {
    expect(repartitionPilotes(construireLignesSimulationsDepartement([stats("03", "Allier", 4, 0)]))).toMatchObject({
      partPilotes: 100,
      partHorsPilotes: 0,
    });
    expect(repartitionPilotes(construireLignesSimulationsDepartement([stats("75", "Paris", 4, 0)]))).toMatchObject({
      partPilotes: 0,
      partHorsPilotes: 100,
    });
    expect(repartitionPilotes([])).toBeNull();
    expect(repartitionPilotes(construireLignesSimulationsDepartement([stats("75", "Paris", 0, 0)]))).toBeNull();
  });
});

describe("totalDepuisEntonnoir", () => {
  const stat = (valeur: number) => ({ valeur, variation: null });

  it("reprend à l'identique le total, les éligibles et les non éligibles de l'entonnoir", () => {
    const total = totalDepuisEntonnoir({
      simulationsMatomo: stat(7842),
      simulationsEligibles: stat(1772),
      simulationsNonEligibles: stat(6070),
    });

    expect(total).toEqual({ simulations: 7842, eligibles: 1772, nonEligibles: 6070, pourcentageEligibles: 23 });
  });

  it("renvoie null dès qu'un des trois chiffres manque, jamais un zéro à sa place", () => {
    const complet = {
      simulationsMatomo: stat(10),
      simulationsEligibles: stat(4),
      simulationsNonEligibles: stat(6),
    };

    expect(totalDepuisEntonnoir(null)).toBeNull();
    expect(totalDepuisEntonnoir({ ...complet, simulationsMatomo: null })).toBeNull();
    expect(totalDepuisEntonnoir({ ...complet, simulationsEligibles: null })).toBeNull();
    expect(totalDepuisEntonnoir({ ...complet, simulationsNonEligibles: null })).toBeNull();
  });

  it("n'invente pas de taux quand l'entonnoir n'a aucun résultat", () => {
    const total = totalDepuisEntonnoir({
      simulationsMatomo: stat(0),
      simulationsEligibles: stat(0),
      simulationsNonEligibles: stat(0),
    });

    expect(total?.pourcentageEligibles).toBe(0);
  });
});

describe("versCsvSimulationsDepartement", () => {
  it("produit un CSV point-virgule avec BOM, une ligne par département", () => {
    const csv = versCsvSimulationsDepartement(construireLignesSimulationsDepartement([stats("03", "Allier", 40, 30)]));

    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.slice(1).split("\r\n")).toEqual([
      "Code département;Département;Département pilote;Visites avec un résultat (cumul non dédoublonné);Éligibles;Non éligibles;Taux d'éligibilité (%);Comptes créés;Dossiers DN créés",
      "03;Allier;Oui;40;30;10;75;2;1",
      "",
    ]);
  });

  it("protège un champ contenant le séparateur ou des guillemets", () => {
    const csv = versCsvSimulationsDepartement(construireLignesSimulationsDepartement([stats("99", 'Nom; "x"', 1, 0)]));

    expect(csv).toContain('99;"Nom; ""x""";Non;');
  });
});
