import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getEpciByCommune,
  fetchCommuneByCode,
  fetchCentresCommunesDepartement,
  fetchContoursDepartements,
} from "./geo.adapter";

describe("Geo Adapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchCommuneByCode", () => {
    it("doit retourner les données de la commune avec le code EPCI", async () => {
      // GIVEN
      const mockResponse = {
        code: "54099",
        nom: "Bouxières-aux-Dames",
        codeEpci: "200069433",
        codeDepartement: "54",
        codeRegion: "44",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // WHEN
      const result = await fetchCommuneByCode("54099");

      // THEN
      expect(result.codeEpci).toBe("200069433");
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/communes/54099"));
    });

    it("doit lever une erreur si le code INSEE est invalide", async () => {
      // GIVEN / WHEN / THEN
      await expect(fetchCommuneByCode("")).rejects.toThrow("Code INSEE invalide");
    });

    it("doit lever une erreur si la commune n'existe pas", async () => {
      // GIVEN
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      // WHEN / THEN
      await expect(fetchCommuneByCode("99999")).rejects.toThrow("Commune non trouvée");
    });
  });

  describe("getEpciByCommune", () => {
    it("doit retourner le code EPCI", async () => {
      // GIVEN
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ codeEpci: "200069433" }),
      });

      // WHEN
      const result = await getEpciByCommune("54099");

      // THEN
      expect(result).toBe("200069433");
    });

    it("doit retourner null en cas d'erreur", async () => {
      // GIVEN
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      // WHEN
      const result = await getEpciByCommune("54099");

      // THEN
      expect(result).toBeNull();
    });

    it("doit retourner null si la commune n'a pas d'EPCI", async () => {
      // GIVEN
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ code: "54099", nom: "Test" }), // pas de codeEpci
      });

      // WHEN
      const result = await getEpciByCommune("54099");

      // THEN
      expect(result).toBeNull();
    });
  });
});

describe("fetchCentresCommunesDepartement", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renvoie le centre de chaque commune, arrondissements compris, et écarte celles qui n'en ont pas", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          { code: "75056", centre: { type: "Point", coordinates: [2.347, 48.8589] } },
          { code: "75101", centre: { type: "Point", coordinates: [2.3359, 48.862] } },
          { code: "75999" },
        ]),
    });

    const centres = await fetchCentresCommunesDepartement("75");

    expect(centres).toEqual([
      { code: "75056", lon: 2.347, lat: 48.8589 },
      { code: "75101", lon: 2.3359, lat: 48.862 },
    ]);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("codeDepartement=75"));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("arrondissement-municipal"));
  });

  it("lève une erreur quand l'API répond en erreur", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503, statusText: "Service Unavailable" });

    await expect(fetchCentresCommunesDepartement("03")).rejects.toThrow("503");
  });
});

describe("fetchContoursDepartements", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("indexe chaque contour par code officiel du département", async () => {
    const allier = {
      type: "Polygon",
      coordinates: [
        [
          [2.2, 46.2],
          [3.9, 46.2],
          [3.0, 46.8],
          [2.2, 46.2],
        ],
      ],
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [{ properties: { code: "03", nom: "Allier" }, geometry: allier }] }),
    });

    expect(await fetchContoursDepartements()).toEqual({ "03": allier });
  });

  it("lève une erreur quand le fichier ne répond pas", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503, statusText: "Service Unavailable" });

    await expect(fetchContoursDepartements()).rejects.toThrow("503");
  });
});
