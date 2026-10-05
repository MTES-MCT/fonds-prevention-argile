import { describe, it, expect } from "vitest";
import { categoriserReponses, compterPoints, computeResultat, getCategorieReponse } from "./categorisation.service";

describe("getCategorieReponse", () => {
  it("lit la catégorie dans la grille", () => {
    expect(getCategorieReponse("reseaux_enterres", "sous_fondations")).toBe("critique");
    expect(getCategorieReponse("gravier_proprete", "present_tout_pourtour")).toBe("critique");
    expect(getCategorieReponse("gravier_proprete", "present_localise")).toBe("vigilance");
    expect(getCategorieReponse("gravier_proprete", "absent")).toBe("a_verifier");
    expect(getCategorieReponse("gouttieres", "entretenues_evacuation_proche")).toBe("bonne_pratique");
    expect(getCategorieReponse("source_chaleur_sous_sol", "pas_de_sous_sol")).toBe("sans_objet");
  });

  it("ne renvoie rien pour l'essence de l'arbre, l'aléa ou une réponse inconnue", () => {
    expect(getCategorieReponse("arbre_essence", "peuplier")).toBeNull();
    expect(getCategorieReponse("aleaRga", "fort")).toBeNull();
    expect(getCategorieReponse("pente_terrain", "valeur_inconnue")).toBeNull();
  });
});

describe("categoriserReponses", () => {
  it("produit un point par réponse catégorisée, dans l'ordre des questions", () => {
    const points = categoriserReponses({
      haies: "proches_denses",
      pente_terrain: "vers_facade",
      reseaux_enterres: "eloignes",
    });

    expect(points).toEqual([
      { critereId: "pente_terrain", reponse: "vers_facade", categorie: "vigilance" },
      { critereId: "reseaux_enterres", reponse: "eloignes", categorie: "bonne_pratique" },
      { critereId: "haies", reponse: "proches_denses", categorie: "critique" },
    ]);
  });

  it("ignore l'aléa : c'est une donnée de contexte, pas un point", () => {
    expect(categoriserReponses({ aleaRga: "fort" })).toEqual([]);
  });

  it("ignore les réponses sans objet", () => {
    expect(categoriserReponses({ ensoleillement: "modere", source_chaleur_sous_sol: "pas_de_sous_sol" })).toEqual([]);
  });

  it("ne tire aucun point de l'essence : c'est « arbre proche = oui » qui porte le point critique", () => {
    const points = categoriserReponses({ arbre_proximite: "oui", arbre_essence: "peuplier" });

    expect(points).toEqual([{ critereId: "arbre_proximite", reponse: "oui", categorie: "critique" }]);
  });

  it("ne renvoie rien sans réponse", () => {
    expect(categoriserReponses({})).toEqual([]);
  });
});

describe("compterPoints", () => {
  it("compte les points par catégorie", () => {
    const { points } = computeResultat({
      eaux: { reseaux_enterres: "sous_fondations", gouttieres: "absentes_ou_debordantes", pente_terrain: "plat" },
      vegetation: { arbre_proximite: "oui", haies: "eloignees_peu_denses" },
      divers: { source_chaleur_sous_sol: "oui_mur_non_isole", ensoleillement: "modere" },
    });

    expect(compterPoints(points)).toEqual({ critique: 3, vigilance: 1, a_verifier: 1, bonne_pratique: 1 });
  });

  it("part de zéro partout", () => {
    expect(compterPoints([])).toEqual({ critique: 0, vigilance: 0, a_verifier: 0, bonne_pratique: 0 });
  });
});
