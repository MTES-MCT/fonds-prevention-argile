import { describe, it, expect } from "vitest";
import { comparerSimulations } from "./comparaison-simulations.service";
import type { PartialRGASimulationData } from "@/shared/domain/types/rga-simulation.types";

const eligible = {
  logement: {
    adresse: "97 rue de Notz, 36000 Châteauroux",
    type: "maison",
    niveaux: 2,
    mitoyen: false,
    proprietaire_occupant: true,
    zone_dexposition: "fort",
    annee_de_construction: "2008",
    code_departement: "36",
    code_region: "24",
    commune: "36044",
  },
  rga: { sinistres: "saine", assure: true, indemnise_indemnise_rga: false, demande_catnat_en_cours: false },
  menage: { personnes: 4, revenu_rga: 30000 },
} as PartialRGASimulationData;

function avec(logement: Record<string, unknown>): PartialRGASimulationData {
  return { ...eligible, logement: { ...eligible.logement, ...logement } } as PartialRGASimulationData;
}

describe("comparerSimulations", () => {
  it("ne signale rien entre deux versions identiques", () => {
    const res = comparerSimulations(eligible, eligible);

    expect(res.identiques).toBe(true);
    expect(res.champsDifferents).toEqual([]);
    expect(res.verdictsDivergent).toBe(false);
  });

  it("signale en bleu une différence sans effet sur l'éligibilité", () => {
    const res = comparerSimulations(eligible, avec({ annee_de_construction: "2009", niveaux: 1 }));

    expect(res.verdictsDivergent).toBe(false);
    expect(res.signalements).toEqual({ anneeConstruction: "diff", nombreNiveaux: "diff" });
    expect(res.verdictCandidate.isEligible).toBe(true);
  });

  it("signale en rouge le seul champ qui coûte l'éligibilité", () => {
    const res = comparerSimulations(eligible, avec({ annee_de_construction: "2009", niveaux: 4 }));

    expect(res.verdictsDivergent).toBe(true);
    expect(res.verdictCandidate.isNonEligible).toBe(true);
    // L'année change aussi, mais son critère passe toujours : elle reste en bleu.
    expect(res.signalements).toEqual({ anneeConstruction: "diff", nombreNiveaux: "bloquant" });
  });

  it("détecte la divergence dans l'autre sens : la nouvelle version rétablit l'éligibilité", () => {
    const res = comparerSimulations(avec({ niveaux: 4 }), eligible);

    expect(res.verdictActive.isNonEligible).toBe(true);
    expect(res.verdictCandidate.isEligible).toBe(true);
    expect(res.verdictsDivergent).toBe(true);
  });

  it("ne fait pas diverger deux simulations sans verdict tranché", () => {
    const incomplete = { logement: { type: "maison" } } as PartialRGASimulationData;

    const res = comparerSimulations(incomplete, incomplete);

    expect(res.verdictsDivergent).toBe(false);
  });

  it("voit un changement d'adresse, qui ne porte pourtant aucun critère", () => {
    const demenage = {
      ...eligible,
      logement: { ...eligible.logement, adresse: "12 rue des Lilas, 75011 Paris", commune: "75111" },
    } as PartialRGASimulationData;

    const res = comparerSimulations(eligible, demenage);

    // Sans l'adresse, les deux simulations passaient pour identiques : aucun arbitrage
    // n'était proposé et la nouvelle adresse partait avec le cache local.
    expect(res.identiques).toBe(false);
    expect(res.champsDifferents).toContain("adresse");
    expect(res.signalements.adresse).toBe("diff");
  });

  it("signale en rouge une demande d'aide catnat qui coûte l'éligibilité", () => {
    const avecCatnat = {
      ...eligible,
      rga: { ...eligible.rga, demande_catnat_en_cours: true },
    } as PartialRGASimulationData;

    const res = comparerSimulations(eligible, avecCatnat);

    // Le critère n'était comparé nulle part : un basculement d'éligibilité passait
    // pour « simulations identiques » et l'arbitrage était sauté.
    expect(res.identiques).toBe(false);
    expect(res.champsDifferents).toContain("demandeCatnat");
    expect(res.signalements.demandeCatnat).toBe("bloquant");
    expect(res.verdictsDivergent).toBe(true);
  });
});
