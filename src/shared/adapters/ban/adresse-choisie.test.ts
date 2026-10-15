import { describe, expect, it } from "vitest";
import { adresseChoisieDepuisBan, banFeatureDepuisAdresse } from "./adresse-choisie";
import type { BanFeature } from "./ban.types";

const feature: BanFeature = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [1.69, 46.81] },
  properties: {
    label: "97 Rue de Notz 36000 Châteauroux",
    score: 0.97,
    id: "36044_1234_00097",
    type: "housenumber",
    name: "97 Rue de Notz",
    postcode: "36000",
    citycode: "36044",
    city: "Châteauroux",
    context: "36, Indre, Centre-Val de Loire",
  },
};

describe("adresseChoisieDepuisBan", () => {
  it("retient les coordonnées du bâtiment quand il est sélectionné", () => {
    const adresse = adresseChoisieDepuisBan(feature, { rnb: "RNB-1", coordonnees: { lat: 46.8, lon: 1.7 } });

    expect(adresse).toMatchObject({
      label: "97 Rue de Notz 36000 Châteauroux",
      lat: 46.8,
      lon: 1.7,
      clefBan: "36044_1234_00097",
      codeInsee: "36044",
      communeNom: "Châteauroux",
      codeDepartement: "36",
      rnb: "RNB-1",
      codeEpci: null,
    });
  });

  it("retombe sur le point de l'adresse BAN sans bâtiment", () => {
    const adresse = adresseChoisieDepuisBan(feature, { rnb: null });

    expect(adresse).toMatchObject({ lat: 46.81, lon: 1.69, rnb: null });
  });
});

describe("banFeatureDepuisAdresse", () => {
  it("restitue une feature exploitable par la recherche et la carte", () => {
    const adresse = adresseChoisieDepuisBan(feature, { rnb: "RNB-1", codeEpci: "200040715" });
    const restituee = banFeatureDepuisAdresse(adresse);

    expect(restituee.geometry.coordinates).toEqual([1.69, 46.81]);
    expect(restituee.properties).toMatchObject({
      label: "97 Rue de Notz 36000 Châteauroux",
      id: "36044_1234_00097",
      citycode: "36044",
      city: "Châteauroux",
      context: "36",
    });
  });

  it("garde le département lisible par le reste de l'adapter", () => {
    const adresse = adresseChoisieDepuisBan(feature, { rnb: null });

    expect(adresseChoisieDepuisBan(banFeatureDepuisAdresse(adresse), { rnb: null }).codeDepartement).toBe("36");
  });
});
