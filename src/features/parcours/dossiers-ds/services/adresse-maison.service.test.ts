import { describe, it, expect, vi, beforeEach } from "vitest";

const ban = vi.hoisted(() => ({ searchAddress: vi.fn() }));
vi.mock("@/shared/adapters/ban", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/adapters/ban")>()),
  searchAddress: ban.searchAddress,
}));
const zones = vi.hoisted(() => ({ findAleaByCoordinates: vi.fn() }));
vi.mock("@/shared/database/repositories", () => ({ rgaZonesRepository: zones }));

import { localiserMaison } from "./adresse-maison.service";

const ADRESSE = { texte: "5 avenue de l'Yser", communeCode: "32013", communeNom: "Auch" };
const POINT = "https://www.google.com/maps/search/?api=1&query=43.648545,0.592896";
const TEXTE = "https://www.google.com/maps/search/?api=1&query=5%20avenue%20de%20l'Yser%2C%20Auch";

function feature(proprietes: Record<string, unknown> = {}) {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [0.592896, 43.648545] },
    properties: {
      type: "housenumber",
      score: 0.97,
      citycode: "32013",
      label: "5 Avenue de l'Yser 32000 Auch",
      ...proprietes,
    },
  };
}

describe("localiserMaison", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ban.searchAddress.mockResolvedValue([feature()]);
    zones.findAleaByCoordinates.mockResolvedValue("fort");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("géocode dans la commune déclarée et lit la zone au point trouvé", async () => {
    await expect(localiserMaison(ADRESSE)).resolves.toEqual({
      point: { lat: 43.648545, lon: 0.592896 },
      zoneAlea: "Fort",
      lienCarte: POINT,
    });
    expect(ban.searchAddress).toHaveBeenCalledWith("5 avenue de l'Yser", { limit: 1, citycode: "32013" });
    expect(zones.findAleaByCoordinates).toHaveBeenCalledWith(0.592896, 43.648545);
  });

  it("écrit « Hors zone » quand le point ne tombe dans aucun polygone", async () => {
    zones.findAleaByCoordinates.mockResolvedValue(null);

    await expect(localiserMaison(ADRESSE)).resolves.toMatchObject({ zoneAlea: "Hors zone" });
  });

  it("ne donne aucune zone si la recherche PostGIS échoue, jamais « Hors zone »", async () => {
    zones.findAleaByCoordinates.mockRejectedValue(new Error("connexion perdue"));

    await expect(localiserMaison(ADRESSE)).resolves.toEqual({
      point: { lat: 43.648545, lon: 0.592896 },
      zoneAlea: null,
      lienCarte: POINT,
    });
  });

  it.each([
    ["un résultat peu sûr", () => ban.searchAddress.mockResolvedValue([feature({ score: 0.3 })])],
    ["une rue sans numéro", () => ban.searchAddress.mockResolvedValue([feature({ type: "street" })])],
    ["aucun résultat", () => ban.searchAddress.mockResolvedValue([])],
    ["BAN indisponible", () => ban.searchAddress.mockRejectedValue(new Error("Erreur API BAN: 503"))],
  ])("retombe sur une recherche en texte, sans zone, pour %s", async (_cas, preparer) => {
    preparer();

    await expect(localiserMaison(ADRESSE)).resolves.toEqual({ point: null, zoneAlea: null, lienCarte: TEXTE });
    expect(zones.findAleaByCoordinates).not.toHaveBeenCalled();
  });

  it("ne cherche rien sans adresse", async () => {
    await expect(localiserMaison({ texte: null, communeCode: "32013", communeNom: "Auch" })).resolves.toEqual({
      point: null,
      zoneAlea: null,
      lienCarte: null,
    });
    expect(ban.searchAddress).not.toHaveBeenCalled();
  });
});
