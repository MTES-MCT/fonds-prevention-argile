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

  it("ne renvoie rien pour l'aléa ou une réponse inconnue", () => {
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

  it("tire le point de l'arbre de son essence : critique pour les grands arbres, vigilance pour les fruitiers", () => {
    expect(categoriserReponses({ arbre_proximite: "oui", arbre_essence: "tres_gourmand" })).toEqual([
      { critereId: "arbre_essence", reponse: "tres_gourmand", categorie: "critique" },
    ]);
    expect(categoriserReponses({ arbre_proximite: "oui", arbre_essence: "grand_ornement" })).toEqual([
      { critereId: "arbre_essence", reponse: "grand_ornement", categorie: "critique" },
    ]);
    expect(categoriserReponses({ arbre_proximite: "oui", arbre_essence: "fruitier_petit" })).toEqual([
      { critereId: "arbre_essence", reponse: "fruitier_petit", categorie: "vigilance" },
    ]);
    expect(categoriserReponses({ arbre_proximite: "oui", arbre_essence: "ne_sais_pas" })).toEqual([
      { critereId: "arbre_essence", reponse: "ne_sais_pas", categorie: "critique" },
    ]);
  });

  it("ignore une essence restée en mémoire quand l'arbre n'est plus signalé", () => {
    expect(categoriserReponses({ arbre_proximite: "non", arbre_essence: "tres_gourmand" })).toEqual([
      { critereId: "arbre_proximite", reponse: "non", categorie: "bonne_pratique" },
    ]);
  });

  it("ne renvoie rien sans réponse", () => {
    expect(categoriserReponses({})).toEqual([]);
  });
});

describe("compterPoints", () => {
  it("compte les points par catégorie", () => {
    const { points } = computeResultat({
      eaux: { reseaux_enterres: "sous_fondations", gouttieres: "absentes_ou_debordantes", pente_terrain: "plat" },
      vegetation: { arbre_proximite: "oui", arbre_essence: "tres_gourmand", haies: "eloignees_peu_denses" },
      divers: { source_chaleur_sous_sol: "oui_mur_non_isole", ensoleillement: "modere" },
    });

    expect(compterPoints(points)).toEqual({ critique: 3, vigilance: 1, a_verifier: 1, bonne_pratique: 1 });
  });

  it("part de zéro partout", () => {
    expect(compterPoints([])).toEqual({ critique: 0, vigilance: 0, a_verifier: 0, bonne_pratique: 0 });
  });
});
