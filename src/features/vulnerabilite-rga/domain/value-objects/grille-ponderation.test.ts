import { describe, it, expect } from "vitest";
import { CATEGORIES_CONFIG, CRITERES_CONFIG, ESSENCES_AGRESSIVITE } from "./grille-ponderation";

/**
 * Garde-fou : ce fichier ne teste pas la pertinence métier de la grille (impossible
 * sans expert RGA), seulement sa cohérence interne. Il casse dès qu'un poids est
 * modifié sans recalculer le reste — c'est ce qui garantit que grille-ponderation.ts
 * reste le SEUL fichier à changer pour ajuster la méthode.
 */
describe("grille-ponderation", () => {
  it("la somme des poids des catégories fait 100", () => {
    const somme = CATEGORIES_CONFIG.reduce((acc, c) => acc + c.poids, 0);
    expect(somme).toBe(100);
  });

  it("pour chaque catégorie, la somme des poids des critères fait 100", () => {
    for (const categorie of CATEGORIES_CONFIG) {
      const criteres = CRITERES_CONFIG.filter((c) => c.categorie === categorie.id);
      const somme = criteres.reduce((acc, c) => acc + c.poids, 0);
      expect(somme, `catégorie "${categorie.id}"`).toBe(100);
    }
  });

  it("tous les scores de tous les barèmes sont dans [0,100]", () => {
    for (const critere of CRITERES_CONFIG) {
      for (const reponse of critere.bareme) {
        expect(reponse.score, `${critere.id} / ${reponse.reponse}`).toBeGreaterThanOrEqual(0);
        expect(reponse.score, `${critere.id} / ${reponse.reponse}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it("tous les scores de ESSENCES_AGRESSIVITE sont dans [0,100]", () => {
    for (const [essence, { score }] of Object.entries(ESSENCES_AGRESSIVITE)) {
      expect(score, essence).toBeGreaterThanOrEqual(0);
      expect(score, essence).toBeLessThanOrEqual(100);
    }
  });

  it("chaque critère appartient à une catégorie déclarée", () => {
    const categoriesIds = new Set(CATEGORIES_CONFIG.map((c) => c.id));
    for (const critere of CRITERES_CONFIG) {
      expect(categoriesIds.has(critere.categorie), critere.id).toBe(true);
    }
  });

  it("arbre_essence est bien conditionné à arbre_proximite = oui", () => {
    const arbreEssence = CRITERES_CONFIG.find((c) => c.id === "arbre_essence");
    expect(arbreEssence?.conditionnelA).toEqual({ critereId: "arbre_proximite", reponseRequise: "oui" });
  });
});
