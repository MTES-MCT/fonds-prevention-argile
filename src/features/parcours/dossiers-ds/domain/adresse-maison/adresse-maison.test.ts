import { describe, it, expect } from "vitest";
import { ZONES_ALEA_DN, lienGoogleMaps, pointFiable, zoneAleaDn, type ResultatGeocodage } from "./adresse-maison";

const AUCH = "32013";
const ADRESSE = { texte: "5 avenue de l'Yser", communeCode: AUCH, communeNom: "Auch" };

function resultat(valeurs: Partial<ResultatGeocodage> = {}): ResultatGeocodage {
  return { type: "housenumber", score: 0.9, citycode: AUCH, point: { lat: 43.648545, lon: 0.592896 }, ...valeurs };
}

describe("zoneAleaDn", () => {
  it.each([
    ["fort", "Fort"],
    ["moyen", "Moyen"],
    ["faible", "Faible"],
    [null, "Hors zone"],
  ] as const)("%s → %s", (alea, libelle) => {
    expect(zoneAleaDn(alea)).toBe(libelle);
  });

  it("garde les libellés exacts de la liste DN", () => {
    expect(Object.values(ZONES_ALEA_DN)).toEqual(["Fort", "Moyen", "Faible", "Hors zone"]);
  });
});

describe("pointFiable", () => {
  it("retient un numéro de rue sûr dans la commune déclarée", () => {
    expect(pointFiable(resultat(), AUCH)).toEqual({ lat: 43.648545, lon: 0.592896 });
  });

  it.each([
    ["une rue sans numéro", resultat({ type: "street" })],
    ["un score trop bas", resultat({ score: 0.4 })],
    ["une autre commune", resultat({ citycode: "32107" })],
    ["aucun résultat", null],
  ])("écarte %s", (_cas, r) => {
    expect(pointFiable(r, AUCH)).toBeNull();
  });
});

describe("lienGoogleMaps", () => {
  it("ouvre Street View sur le point géocodé", () => {
    expect(lienGoogleMaps({ lat: 43.648545, lon: 0.592896 }, ADRESSE)).toBe(
      "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=43.648545,0.592896"
    );
  });

  it("cherche l'adresse en texte, commune comprise, sans point fiable", () => {
    expect(lienGoogleMaps(null, ADRESSE)).toBe(
      "https://www.google.com/maps/search/?api=1&query=5%20avenue%20de%20l'Yser%2C%20Auch"
    );
  });

  it("ne donne rien sans adresse", () => {
    expect(lienGoogleMaps(null, { texte: "  ", communeCode: AUCH, communeNom: "Auch" })).toBeNull();
  });
});
