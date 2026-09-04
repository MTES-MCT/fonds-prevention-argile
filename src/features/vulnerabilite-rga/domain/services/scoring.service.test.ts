import { describe, it, expect } from "vitest";
import { computeScoreResult, getNiveauVulnerabilite, getImpactScore } from "./scoring.service";
import type { PartialVulnerabiliteReponses } from "../types/vulnerabilite-reponses.types";

const REPONSES_IDEALES: PartialVulnerabiliteReponses = {
  adresse: {
    label: "1 rue Test",
    communeNom: "Testville",
    codeDepartement: "81",
    coordonnees: "43.9,2.15",
    clefBan: "abc",
    rnb: "rnb-1",
    aleaRga: "nul",
  },
  eaux: {
    pente_terrain: "eloignee_facade",
    reseaux_enterres: "eloignes",
    gravier_proprete: "absent",
    gouttieres: "entretenues_evacuation_loin",
  },
  vegetation: {
    arbre_proximite: "non",
    haies: "eloignees_peu_denses",
    vegetation_pied_facade: "absente",
  },
  divers: {
    mitoyennete: "pas_mitoyen",
    ensoleillement: "faible_ombrage",
  },
};

const REPONSES_PIRES: PartialVulnerabiliteReponses = {
  adresse: { ...REPONSES_IDEALES.adresse!, aleaRga: "fort" },
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

describe("computeScoreResult", () => {
  it("renvoie 0 si toutes les réponses sont idéales", () => {
    const result = computeScoreResult(REPONSES_IDEALES);
    expect(result.scoreGlobal).toBe(0);
  });

  it("renvoie 100 si toutes les réponses sont les pires possibles", () => {
    const result = computeScoreResult(REPONSES_PIRES);
    expect(result.scoreGlobal).toBe(100);
  });

  it("exclut arbre_essence du calcul quand arbre_proximite n'est pas 'oui' (score non pénalisé)", () => {
    const sansArbre: PartialVulnerabiliteReponses = {
      ...REPONSES_IDEALES,
      vegetation: { ...REPONSES_IDEALES.vegetation, arbre_proximite: "non" },
    };
    const result = computeScoreResult(sansArbre);
    const arbreEssenceDetail = result.details.find((d) => d.critereId === "arbre_essence");
    expect(arbreEssenceDetail?.score).toBeNull();
    expect(result.scoreGlobal).toBe(0);
  });

  it("un parcours partiel (peu de réponses) ne fausse pas le score vers 0", () => {
    const partiel: PartialVulnerabiliteReponses = {
      eaux: { pente_terrain: "vers_facade" }, // pire réponse sur ce seul critère répondu
    };
    const result = computeScoreResult(partiel);
    // Seul le critère répondu compte : score de sa catégorie = 100, les autres catégories = null
    // (exclues du calcul global), donc le score global doit refléter uniquement "eaux".
    expect(result.scoreParCategorie.eaux).toBe(100);
    expect(result.scoreParCategorie.sol).toBeNull();
    expect(result.scoreGlobal).toBe(100);
  });

  it("renvoie 0 si aucune réponse n'est fournie", () => {
    const result = computeScoreResult({});
    expect(result.scoreGlobal).toBe(0);
  });
});

describe("getImpactScore", () => {
  it("renvoie le score de la réponse pour un critère normal", () => {
    expect(getImpactScore("pente_terrain", "vers_facade")).toBe(100);
    expect(getImpactScore("pente_terrain", "eloignee_facade")).toBe(0);
  });

  it("renvoie le score dérivé de ESSENCES_AGRESSIVITE pour arbre_essence", () => {
    expect(getImpactScore("arbre_essence", "peuplier")).toBe(100);
    expect(getImpactScore("arbre_essence", "conifere")).toBe(25);
  });

  it("renvoie null pour un critère ou une réponse inconnue", () => {
    expect(getImpactScore("critere_inconnu", "x")).toBeNull();
    expect(getImpactScore("pente_terrain", "reponse_inconnue")).toBeNull();
  });
});

describe("getNiveauVulnerabilite", () => {
  it("classe correctement aux bornes des seuils", () => {
    expect(getNiveauVulnerabilite(0)).toBe("faible");
    expect(getNiveauVulnerabilite(24)).toBe("faible");
    expect(getNiveauVulnerabilite(25)).toBe("modere");
    expect(getNiveauVulnerabilite(49)).toBe("modere");
    expect(getNiveauVulnerabilite(50)).toBe("eleve");
    expect(getNiveauVulnerabilite(74)).toBe("eleve");
    expect(getNiveauVulnerabilite(75)).toBe("tres_eleve");
    expect(getNiveauVulnerabilite(100)).toBe("tres_eleve");
  });
});
