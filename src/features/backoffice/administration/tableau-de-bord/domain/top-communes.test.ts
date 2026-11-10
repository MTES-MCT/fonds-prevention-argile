import { describe, expect, it } from "vitest";
import { classerTopCommunes } from "./top-communes";

const simulation = (commune_nom: string, code_departement: string | number) => ({
  rgaSimulationData: { logement: { commune_nom, code_departement } },
  rgaSimulationDataAgent: null,
});

describe("classerTopCommunes", () => {
  it("retrouve les communes de l'Allier quand le filtre arrive sans zéro", () => {
    const top = classerTopCommunes([simulation("Moulins", "03"), simulation("Lille", "59")], "3");

    expect(top).toEqual([{ commune: "Moulins", codeDepartement: "03", simulations: 1 }]);
  });

  it("compte une seule ligne pour une commune stockée en « 3 » puis en « 03 »", () => {
    const top = classerTopCommunes([simulation("Moulins", 3), simulation("Moulins", "03")]);

    expect(top).toEqual([{ commune: "Moulins", codeDepartement: "03", simulations: 2 }]);
  });

  it("préfère la simulation de l'agent à celle du demandeur", () => {
    const top = classerTopCommunes([
      {
        rgaSimulationData: { logement: { commune_nom: "Lille", code_departement: "59" } },
        rgaSimulationDataAgent: { logement: { commune_nom: "Moulins", code_departement: "03" } },
      },
    ]);

    expect(top[0]).toMatchObject({ commune: "Moulins" });
  });

  it("ignore un parcours sans commune ou sans département", () => {
    expect(classerTopCommunes([{ rgaSimulationData: { logement: {} }, rgaSimulationDataAgent: null }])).toEqual([]);
  });
});
