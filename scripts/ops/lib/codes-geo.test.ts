import { describe, expect, it } from "vitest";
import { normaliserCodesGeo } from "./codes-geo";

describe("normaliserCodesGeo", () => {
  it("remet au format officiel une simulation de 2025 stockée en nombres", () => {
    const simulation = {
      logement: { code_departement: 3, commune: 3023, epci: 200071363, code_region: 84, niveaux: 2 },
      simulatedAt: "2025-11-21T16:08:37.232Z",
    };

    const { simulation: resultat, changements } = normaliserCodesGeo(simulation);

    expect(resultat.logement).toEqual({
      code_departement: "03",
      commune: "03023",
      epci: "200071363",
      code_region: "84",
      niveaux: 2,
    });
    expect(resultat.simulatedAt).toBe(simulation.simulatedAt);
    expect(changements.map((c) => c.champ)).toEqual(["code_departement", "commune", "code_region", "epci"]);
  });

  it("complète une chaîne sans zéro initial", () => {
    const { simulation } = normaliserCodesGeo({ logement: { code_departement: "3", commune: "3023" } });
    expect(simulation.logement).toEqual({ code_departement: "03", commune: "03023" });
  });

  it("ne touche ni une simulation déjà au format officiel ni la Corse", () => {
    const officielle = { logement: { code_departement: "03", commune: "03023", epci: "200071363" } };
    const corse = { logement: { code_departement: "2A", commune: "2A004" } };

    expect(normaliserCodesGeo(officielle)).toEqual({ simulation: officielle, changements: [] });
    expect(normaliserCodesGeo(corse)).toEqual({ simulation: corse, changements: [] });
  });

  it("n'ajoute aucun champ absent de la simulation", () => {
    const { simulation, changements } = normaliserCodesGeo({ logement: { adresse: "1 rue X", code_departement: 59 } });
    expect(simulation.logement).toEqual({ adresse: "1 rue X", code_departement: "59" });
    expect(changements).toHaveLength(1);
  });

  it("laisse passer une simulation vide ou sans logement", () => {
    expect(normaliserCodesGeo(null)).toEqual({ simulation: null, changements: [] });
    expect(normaliserCodesGeo({ rga: {} })).toEqual({ simulation: { rga: {} }, changements: [] });
  });

  it("ne réécrit pas l'objet d'origine", () => {
    const simulation = { logement: { code_departement: 4 } };
    normaliserCodesGeo(simulation);
    expect(simulation.logement.code_departement).toBe(4);
  });
});
