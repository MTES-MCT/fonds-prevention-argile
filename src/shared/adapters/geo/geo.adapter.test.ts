import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEpciByCommune, fetchCommuneByCode } from "./geo.adapter";

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
