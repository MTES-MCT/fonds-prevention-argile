import { describe, it, expect } from "vitest";
import { getRecommandationsPrioritaires } from "./recommandations.service";
import { computeScoreResult } from "./scoring.service";
import type { PartialVulnerabiliteReponses } from "../types/vulnerabilite-reponses.types";

const REPONSES_PIRES: PartialVulnerabiliteReponses = {
  adresse: {
    label: "1 rue Test",
    communeNom: "Testville",
    codeDepartement: "81",
    coordonnees: "43.9,2.15",
    clefBan: "abc",
    rnb: "rnb-1",
    aleaRga: "fort",
  },
  eaux: {
    pente_terrain: "vers_facade",
    reseaux_enterres: "sous_fondations",
    gravier_proprete: "present",
    gouttieres: "absentes_ou_debordantes",
  },
  vegetation: {
    arbre_proximite: "oui",
    arbre_essence: "peuplier",
    haies: "proches_denses",
    vegetation_pied_facade: "presente",
  },
  divers: {
    mitoyennete: "mitoyen_voisin_sans_travaux",
    ensoleillement: "fort_sud",
  },
};

describe("getRecommandationsPrioritaires", () => {
  it("ne génère jamais de recommandation pour l'aléa du sol, quel que soit son score", () => {
    const result = computeScoreResult(REPONSES_PIRES);
    const recos = getRecommandationsPrioritaires(result, { limit: 20 });
    expect(recos.some((r) => r.critereId === "aleaRga")).toBe(false);
  });

  it("trie par priorité décroissante (poidsGlobal × score)", () => {
    const result = computeScoreResult(REPONSES_PIRES);
    const recos = getRecommandationsPrioritaires(result, { limit: 20 });
    for (let i = 1; i < recos.length; i++) {
      expect(recos[i - 1].priorite).toBeGreaterThanOrEqual(recos[i].priorite);
    }
  });

  it("respecte la limite demandée", () => {
    const result = computeScoreResult(REPONSES_PIRES);
    const recos = getRecommandationsPrioritaires(result, { limit: 2 });
    expect(recos.length).toBeLessThanOrEqual(2);
  });

  it("filtre les scores sous le seuil minimum", () => {
    const reponsesFaibles: PartialVulnerabiliteReponses = {
      eaux: { pente_terrain: "plat" }, // score 10, sous le seuil par défaut (25)
    };
    const result = computeScoreResult(reponsesFaibles);
    const recos = getRecommandationsPrioritaires(result);
    expect(recos.some((r) => r.critereId === "pente_terrain")).toBe(false);
  });

  it("ne renvoie rien si aucune réponse n'est fournie", () => {
    const result = computeScoreResult({});
    expect(getRecommandationsPrioritaires(result)).toHaveLength(0);
  });
});
