import { describe, it, expect } from "vitest";
import { RECOMMANDATIONS_CATALOGUE } from "./recommandations.catalogue";
import { CATEGORIES_A_TRAITER } from "../value-objects/grille-categorisation";
import { getCategorieReponse } from "../services/categorisation.service";

describe("RECOMMANDATIONS_CATALOGUE", () => {
  it("ne se déclenche que sur des réponses classées critique, vigilance ou à vérifier", () => {
    for (const reco of RECOMMANDATIONS_CATALOGUE) {
      for (const reponse of reco.reponsesDeclenchantes) {
        expect(CATEGORIES_A_TRAITER, `${reco.id} / ${reponse}`).toContain(getCategorieReponse(reco.critereId, reponse));
      }
    }
  });

  it("une réponse ne déclenche qu'une seule fiche", () => {
    const declencheurs = RECOMMANDATIONS_CATALOGUE.flatMap((r) =>
      r.reponsesDeclenchantes.map((reponse) => `${r.critereId}/${reponse}`)
    );
    expect(new Set(declencheurs).size).toBe(declencheurs.length);
  });

  it("des ids uniques et au moins un problème et une amélioration par recommandation", () => {
    const ids = RECOMMANDATIONS_CATALOGUE.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const reco of RECOMMANDATIONS_CATALOGUE) {
      expect(reco.problemes.length, reco.id).toBeGreaterThan(0);
      expect(reco.ameliorations.length, reco.id).toBeGreaterThan(0);
    }
  });
});
