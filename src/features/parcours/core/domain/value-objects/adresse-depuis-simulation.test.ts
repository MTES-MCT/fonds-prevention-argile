import { describe, expect, it } from "vitest";
import { adresseChoisieDepuisSimulation } from "./adresse-depuis-simulation";

const logement = {
  adresse: "97 Rue de Notz",
  commune: "36044",
  commune_nom: "Châteauroux",
  code_departement: "36",
  epci: "243600327",
  coordonnees: "46.8,1.68",
  clef_ban: "36044_2080_00097",
  rnb: "RNB1",
};

describe("adresseChoisieDepuisSimulation", () => {
  it("restitue l'adresse, le bâtiment et l'EPCI de la simulation", () => {
    expect(adresseChoisieDepuisSimulation({ logement } as never)).toEqual({
      label: "97 Rue de Notz, Châteauroux",
      lat: 46.8,
      lon: 1.68,
      clefBan: "36044_2080_00097",
      codeInsee: "36044",
      communeNom: "Châteauroux",
      codeDepartement: "36",
      rnb: "RNB1",
      codeEpci: "243600327",
    });
  });

  it("n'ajoute pas la commune quand le libellé la porte déjà", () => {
    const adresse = adresseChoisieDepuisSimulation({
      logement: { ...logement, adresse: "97 Rue de Notz 36000 Châteauroux" },
    } as never);

    expect(adresse?.label).toBe("97 Rue de Notz 36000 Châteauroux");
  });

  it("renvoie null sans de quoi rouvrir la carte", () => {
    expect(adresseChoisieDepuisSimulation({ logement: { adresse: "12 rue de Paris" } } as never)).toBeNull();
    expect(adresseChoisieDepuisSimulation(null)).toBeNull();
  });

  it("tolère un rnb et un epci absents", () => {
    const adresse = adresseChoisieDepuisSimulation({ logement: { ...logement, rnb: "", epci: undefined } } as never);

    expect(adresse).toMatchObject({ rnb: null, codeEpci: null });
  });
});
