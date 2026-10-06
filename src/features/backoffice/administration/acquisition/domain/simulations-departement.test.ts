import { describe, it, expect } from "vitest";
import {
  construireLignesSimulationsDepartement,
  estCodeDepartementConnu,
  filtrerParPerimetre,
  lignesAffichees,
  totaliserSimulations,
  versCsvSimulationsDepartement,
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

describe("estCodeDepartementConnu", () => {
  it("reconnaît les codes, avec ou sans zéro initial, Corse et outre-mer compris", () => {
    expect(["3", "03", "63", "2A", "2B", "971"].every(estCodeDepartementConnu)).toBe(true);
  });

  it("refuse ce qui n'est pas un département", () => {
    expect(["Nom d'événement indéfini", "-", "", "999"].some(estCodeDepartementConnu)).toBe(false);
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

describe("lignesAffichees", () => {
  const lignes = construireLignesSimulationsDepartement([stats("03", "Allier", 40, 30), stats("75", "Paris", 10, 0)]);
  const nonRenseigne = { simulations: 6, simulationsEligibles: 2 };

  it("ajoute la ligne non renseigné en dernier sur « Tous », pour que le total rejoigne l'entonnoir", () => {
    const affichees = lignesAffichees(lignes, nonRenseigne, "tous");

    expect(affichees.at(-1)).toMatchObject({
      nomDepartement: "Département non renseigné",
      pilote: null,
      simulations: 6,
      eligibles: 2,
      nonEligibles: 4,
    });
    expect(totaliserSimulations(affichees).simulations).toBe(56);
  });

  it("ne la compte dans aucun des deux périmètres", () => {
    expect(lignesAffichees(lignes, nonRenseigne, "pilotes").map((l) => l.codeDepartement)).toEqual(["03"]);
    expect(lignesAffichees(lignes, nonRenseigne, "hors-pilotes").map((l) => l.codeDepartement)).toEqual(["75"]);
  });

  it("ne l'affiche pas quand elle est vide", () => {
    expect(lignesAffichees(lignes, { simulations: 0, simulationsEligibles: 0 }, "tous")).toHaveLength(2);
    expect(lignesAffichees(lignes, null, "tous")).toHaveLength(2);
  });

  it("l'exporte sans code ni statut pilote", () => {
    const csv = versCsvSimulationsDepartement(lignesAffichees(lignes, nonRenseigne, "tous"));

    expect(csv).toContain("\r\n;Département non renseigné;;6;2;4;33;0;0\r\n");
  });
});
