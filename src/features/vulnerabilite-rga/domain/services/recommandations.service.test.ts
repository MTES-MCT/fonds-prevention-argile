import { describe, it, expect } from "vitest";
import { getReponsesSansCarte, getSectionsRecommandations } from "./recommandations.service";
import { categoriserReponses } from "./categorisation.service";

describe("getSectionsRecommandations", () => {
  it("regroupe les fiches en trois sections, dans l'ordre critiques, vigilance, à surveiller", () => {
    const sections = getSectionsRecommandations(
      categoriserReponses({
        pente_terrain: "ne_sais_pas",
        gouttieres: "absentes_ou_debordantes",
        haies: "proches_denses",
      })
    );

    expect(sections.map((s) => [s.categorie, s.titre])).toEqual([
      ["critique", "Points critiques"],
      ["vigilance", "Points de vigilance"],
      ["a_verifier", "Points à surveiller"],
    ]);
    expect(sections[0].recommandations.map((r) => r.id)).toEqual(["veg-haies"]);
    expect(sections[1].recommandations.map((r) => r.id)).toEqual(["eaux-gouttieres"]);
    expect(sections[2].recommandations.map((r) => r.id)).toEqual(["eaux-pente"]);
  });

  it("omet une section vide", () => {
    const sections = getSectionsRecommandations(categoriserReponses({ gouttieres: "absentes_ou_debordantes" }));

    expect(sections.map((s) => s.categorie)).toEqual(["vigilance"]);
  });

  it("ne produit aucune section pour des bonnes pratiques, du sans objet ou l'aléa", () => {
    const sections = getSectionsRecommandations(
      categoriserReponses({
        aleaRga: "fort",
        reseaux_enterres: "eloignes",
        gouttieres: "entretenues_evacuation_proche",
        ensoleillement: "modere",
      })
    );

    expect(sections).toEqual([]);
  });

  it("classe la fiche gravier selon la réponse : pourtour critique, localisé vigilance", () => {
    const pourtour = getSectionsRecommandations(categoriserReponses({ gravier_proprete: "present_tout_pourtour" }));
    const localise = getSectionsRecommandations(categoriserReponses({ gravier_proprete: "present_localise" }));

    expect(pourtour[0]).toMatchObject({ categorie: "critique" });
    expect(pourtour[0].recommandations[0].id).toBe("eaux-gravier-tout-pourtour");
    expect(localise[0]).toMatchObject({ categorie: "vigilance" });
    expect(localise[0].recommandations[0].id).toBe("eaux-gravier-localise");
  });

  it("porte la fiche arbre sur l'essence, rangée selon sa catégorie", () => {
    const gourmand = getSectionsRecommandations(
      categoriserReponses({ arbre_proximite: "oui", arbre_essence: "tres_gourmand" })
    );
    const fruitier = getSectionsRecommandations(
      categoriserReponses({ arbre_proximite: "oui", arbre_essence: "fruitier_petit" })
    );

    expect(gourmand).toHaveLength(1);
    expect(gourmand[0].categorie).toBe("critique");
    expect(gourmand[0].recommandations.map((r) => r.id)).toEqual(["veg-arbre"]);
    expect(fruitier[0].categorie).toBe("vigilance");
    expect(fruitier[0].recommandations.map((r) => r.id)).toEqual(["veg-arbre"]);
  });
});

describe("eaux-recuperateur", () => {
  it("reprend la même fiche pour un récupérateur en bon état, rangée dans les points à surveiller", () => {
    const sections = getSectionsRecommandations(categoriserReponses({ recuperateur_eau: "present_bon_etat" }));

    expect(sections).toHaveLength(1);
    expect(sections[0].categorie).toBe("a_verifier");
    expect(sections[0].recommandations.map((r) => r.id)).toEqual(["eaux-recuperateur"]);
  });
});

describe("getReponsesSansCarte", () => {
  // Une réponse sans fiche disparaîtrait du résultat : toute nouvelle réponse à traiter doit en avoir une.
  it("donne une fiche à chaque réponse à traiter", () => {
    expect(getReponsesSansCarte()).toEqual([]);
  });
});
