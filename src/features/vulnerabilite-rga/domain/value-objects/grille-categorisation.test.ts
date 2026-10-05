import { describe, it, expect } from "vitest";
import { CATEGORIES_AFFICHAGE, CRITERES_CONFIG, getCategorieAffichage } from "./grille-categorisation";

const CATEGORIES_VALIDES = [...Object.keys(CATEGORIES_AFFICHAGE), "sans_objet"];

/**
 * Garde-fou : ce fichier ne teste pas la pertinence métier de la grille (elle vient du
 * métier), seulement sa complétude — c'est ce qui garantit que grille-categorisation.ts
 * reste le SEUL fichier à changer pour ajuster la méthode.
 */
describe("grille-categorisation", () => {
  it("chaque réponse d'une question catégorisée porte une catégorie connue", () => {
    for (const critere of CRITERES_CONFIG.filter((c) => !c.sansCategorie)) {
      for (const reponse of critere.reponses) {
        expect(CATEGORIES_VALIDES, `${critere.id} / ${reponse.reponse}`).toContain(reponse.categorie);
      }
    }
  });

  it("une question sans catégorie n'en porte sur aucune réponse", () => {
    for (const critere of CRITERES_CONFIG.filter((c) => c.sansCategorie)) {
      for (const reponse of critere.reponses) {
        expect(reponse.categorie, `${critere.id} / ${reponse.reponse}`).toBeUndefined();
      }
    }
  });

  it("seule l'essence de l'arbre est sans catégorie", () => {
    expect(CRITERES_CONFIG.filter((c) => c.sansCategorie).map((c) => c.id)).toEqual(["arbre_essence"]);
  });

  it("chaque question a des réponses aux identifiants uniques", () => {
    for (const critere of CRITERES_CONFIG) {
      const ids = critere.reponses.map((r) => r.reponse);
      expect(ids.length, critere.id).toBeGreaterThan(0);
      expect(new Set(ids).size, critere.id).toBe(ids.length);
    }
  });

  it("l'aléa RGA ne fait pas partie des questions catégorisées", () => {
    expect(CRITERES_CONFIG.some((c) => c.id === "aleaRga")).toBe(false);
  });

  it("arbre_essence est bien conditionné à arbre_proximite = oui", () => {
    const arbreEssence = CRITERES_CONFIG.find((c) => c.id === "arbre_essence");
    expect(arbreEssence?.conditionnelA).toEqual({ critereId: "arbre_proximite", reponseRequise: "oui" });
  });

  it("les labels suivent les quatre catégories affichées, sans_objet n'en a pas", () => {
    expect(getCategorieAffichage("critique")?.label).toBe("Point critique");
    expect(getCategorieAffichage("vigilance")?.label).toBe("Point de vigilance");
    expect(getCategorieAffichage("a_verifier")?.label).toBe("À surveiller");
    expect(getCategorieAffichage("bonne_pratique")?.label).toBe("Bonne pratique en place");
    expect(getCategorieAffichage("sans_objet")).toBeNull();
    expect(getCategorieAffichage(null)).toBeNull();
  });
});
