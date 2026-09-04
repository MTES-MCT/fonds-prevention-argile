import { describe, it, expect } from "vitest";
import { RECOMMANDATIONS_CATALOGUE } from "./recommandations.catalogue";
import { CRITERES_CONFIG, getCategorieConfig } from "../value-objects/grille-ponderation";

describe("RECOMMANDATIONS_CATALOGUE", () => {
  it("ne référence jamais un critère de la catégorie non actionnable (sol)", () => {
    for (const reco of RECOMMANDATIONS_CATALOGUE) {
      const critere = CRITERES_CONFIG.find((c) => c.id === reco.critereId);
      expect(critere, `critère "${reco.critereId}" introuvable pour la reco "${reco.id}"`).toBeDefined();
      const categorieConfig = getCategorieConfig(critere!.categorie);
      expect(categorieConfig.actionnable, `reco "${reco.id}" référence un critère non actionnable`).toBe(true);
    }
  });

  it("chaque critère actionnable a au moins une recommandation associée", () => {
    // arbre_proximite exclu : quand la réponse est "oui", la navigation force toujours la
    // question arbre_essence juste après (cf. step-flow.rules.ts), dont la recommandation
    // couvre déjà ce cas — plus précise (par essence) qu'une reco générique sur la proximité.
    const criteresActionnables = CRITERES_CONFIG.filter(
      (c) => getCategorieConfig(c.categorie).actionnable && c.id !== "arbre_proximite"
    );
    for (const critere of criteresActionnables) {
      const aUneReco = RECOMMANDATIONS_CATALOGUE.some((r) => r.critereId === critere.id);
      expect(aUneReco, `critère actionnable "${critere.id}" sans recommandation`).toBe(true);
    }
  });

  it("des ids uniques et au moins un bullet par recommandation", () => {
    const ids = RECOMMANDATIONS_CATALOGUE.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const reco of RECOMMANDATIONS_CATALOGUE) {
      expect(reco.bullets.length, reco.id).toBeGreaterThan(0);
    }
  });
});
