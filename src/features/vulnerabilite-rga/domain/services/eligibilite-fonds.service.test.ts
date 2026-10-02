import { describe, it, expect } from "vitest";
import { remplitCriteresEligibiliteFonds } from "./eligibilite-fonds.service";
import { DEPARTEMENTS_ELIGIBLES_RGA } from "@/shared/constants/rga.constants";
import type {
  PartialVulnerabiliteReponses,
  ReponseAleaRga,
  ReponseMitoyennete,
} from "../types/vulnerabilite-reponses.types";

function answers(
  codeDepartement: string | null,
  aleaRga: ReponseAleaRga,
  mitoyennete?: ReponseMitoyennete
): PartialVulnerabiliteReponses {
  return {
    adresse: { label: "", communeNom: null, codeDepartement, coordonnees: null, clefBan: null, rnb: null, aleaRga },
    divers: { mitoyennete },
  };
}

describe("remplitCriteresEligibiliteFonds", () => {
  it("vrai pour chacun des départements éligibles, en aléa fort et non mitoyen", () => {
    for (const code of DEPARTEMENTS_ELIGIBLES_RGA) {
      expect(remplitCriteresEligibiliteFonds(answers(code, "fort", "pas_mitoyen")), code).toBe(true);
    }
  });

  it("faux hors des départements éligibles", () => {
    expect(remplitCriteresEligibiliteFonds(answers("75", "fort", "pas_mitoyen"))).toBe(false);
    expect(remplitCriteresEligibiliteFonds(answers(null, "fort", "pas_mitoyen"))).toBe(false);
  });

  it("faux dès que l'aléa n'est pas fort", () => {
    for (const alea of ["moyen", "faible", "nul"] as const) {
      expect(remplitCriteresEligibiliteFonds(answers("36", alea, "pas_mitoyen")), alea).toBe(false);
    }
  });

  it("faux pour une maison mitoyenne, que le voisin ait fait des travaux ou non", () => {
    expect(remplitCriteresEligibiliteFonds(answers("36", "fort", "mitoyen_voisin_sans_travaux"))).toBe(false);
    expect(remplitCriteresEligibiliteFonds(answers("36", "fort", "mitoyen_voisin_travaux_prevention"))).toBe(false);
  });

  it("faux tant que la mitoyenneté ou l'adresse ne sont pas renseignées", () => {
    expect(remplitCriteresEligibiliteFonds(answers("36", "fort"))).toBe(false);
    expect(remplitCriteresEligibiliteFonds({})).toBe(false);
  });
});
