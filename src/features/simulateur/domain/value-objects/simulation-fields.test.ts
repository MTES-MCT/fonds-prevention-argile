import { describe, it, expect } from "vitest";
import { SIMULATION_FIELDS, SIMULATION_FIELDS_BY_KEY, diffSimulationFields } from "./simulation-fields";
import type { PartialRGASimulationData } from "@/shared/domain/types/rga-simulation.types";

const base = {
  logement: {
    type: "maison",
    niveaux: 2,
    mitoyen: false,
    proprietaire_occupant: true,
    zone_dexposition: "fort",
    annee_de_construction: "2008",
    code_region: "24",
  },
  rga: { sinistres: "saine", assure: true, indemnise_indemnise_rga: false },
  menage: { personnes: 4, revenu_rga: 30000 },
} as PartialRGASimulationData;

describe("SIMULATION_FIELDS", () => {
  it("expose des clés uniques, toutes indexées", () => {
    const cles = SIMULATION_FIELDS.map((f) => f.key);
    expect(new Set(cles).size).toBe(cles.length);
    expect(Object.keys(SIMULATION_FIELDS_BY_KEY)).toHaveLength(cles.length);
  });

  it("formate un champ absent sans inventer de valeur", () => {
    expect(SIMULATION_FIELDS_BY_KEY.nombreNiveaux.formatValue(undefined)).toBe("—");
    expect(SIMULATION_FIELDS_BY_KEY.montantIndemnisation.formatValue(null)).toBe("—");
  });

  it("accorde les libellés au singulier et au pluriel", () => {
    expect(SIMULATION_FIELDS_BY_KEY.nombreNiveaux.formatValue(1)).toBe("1 NIVEAU");
    expect(SIMULATION_FIELDS_BY_KEY.nombreNiveaux.formatValue(4)).toBe("4 NIVEAUX");
    expect(SIMULATION_FIELDS_BY_KEY.nombreHabitants.formatValue(1)).toBe("1 HABITANT");
    expect(SIMULATION_FIELDS_BY_KEY.nombreHabitants.formatValue(4)).toBe("4 HABITANTS");
  });

  it("dérive les revenus de la tranche calculée, pas du revenu brut", () => {
    const champ = SIMULATION_FIELDS_BY_KEY.niveauRevenu;
    expect(champ.formatValue(champ.getValue(base))).toBe("MÉNAGE TRÈS MODESTE");
  });
});

describe("diffSimulationFields", () => {
  it("ne retourne rien entre deux simulations identiques", () => {
    expect(diffSimulationFields(base, base)).toEqual([]);
  });

  it("liste les seuls champs dont la valeur change", () => {
    const apres = { ...base, logement: { ...base.logement, niveaux: 4, annee_de_construction: "2009" } };

    expect(diffSimulationFields(base, apres)).toEqual(["anneeConstruction", "nombreNiveaux"]);
  });

  it("suit la tranche de revenu quand le nombre d'habitants change", () => {
    const apres = { ...base, menage: { ...base.menage, personnes: 1 } };

    expect(diffSimulationFields(base, apres)).toEqual(["nombreHabitants", "niveauRevenu"]);
  });

  it("ignore un champ absent après : un early exit n'est pas un changement", () => {
    const apres = { logement: { type: "maison", niveaux: 2 } } as PartialRGASimulationData;

    expect(diffSimulationFields(base, apres)).toEqual([]);
  });

  it("ne compare rien si une des deux simulations manque", () => {
    expect(diffSimulationFields(null, base)).toEqual([]);
    expect(diffSimulationFields(base, undefined)).toEqual([]);
  });
});
