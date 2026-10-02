import { describe, it, expect } from "vitest";
import { getReponsesSansCarte, getSectionsRecommandations } from "./recommandations.service";
import { categoriserReponses } from "./categorisation.service";

describe("getSectionsRecommandations", () => {
  it("regroupe les fiches en trois sections, dans l'ordre critiques, vigilance, à vérifier", () => {
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
      ["a_verifier", "Points à vérifier"],
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

  it("porte la fiche arbre sur la proximité, quelle que soit l'essence", () => {
    const sections = getSectionsRecommandations(
      categoriserReponses({ arbre_proximite: "oui", arbre_essence: "conifere" })
    );

    expect(sections).toHaveLength(1);
    expect(sections[0].categorie).toBe("critique");
    expect(sections[0].recommandations.map((r) => r.id)).toEqual(["veg-arbre"]);
  });

  it("liste sans conseil un point qu'aucune fiche ne couvre", () => {
    const sections = getSectionsRecommandations(categoriserReponses({ source_chaleur_sous_sol: "oui_mur_non_isole" }));

    expect(sections).toEqual([
      {
        categorie: "critique",
        titre: "Points critiques",
        recommandations: [],
        pointsSansCarte: [
          {
            critereId: "source_chaleur_sous_sol",
            question: "Source de chaleur en sous-sol",
            reponse: "Oui, sur un mur non isolé",
          },
        ],
      },
    ]);
  });
});

describe("getReponsesSansCarte", () => {
  // Liste figée : y ajouter une entrée, c'est accepter qu'un point s'affiche sans conseil.
  it("recense les réponses à traiter qui n'ont pas encore de fiche", () => {
    expect(getReponsesSansCarte()).toEqual([
      "pente_terrain/plat",
      "pente_terrain/eloignee_facade",
      "gravier_proprete/absent",
      "recuperateur_eau/present_bon_etat",
      "source_chaleur_sous_sol/oui_mur_isole",
      "source_chaleur_sous_sol/oui_mur_non_isole",
    ]);
  });
});
