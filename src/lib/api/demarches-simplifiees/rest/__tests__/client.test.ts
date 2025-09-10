import { describe, it, expect, vi, beforeEach } from "vitest";
import { DemarchesSimplifieesPrefillClient } from "../client";

// Mock fetch
global.fetch = vi.fn();

describe("DemarchesSimplifieesPrefillClient", () => {
  let client: DemarchesSimplifieesPrefillClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new DemarchesSimplifieesPrefillClient();
  });

  describe("generatePrefillUrl", () => {
    it("devrait générer une URL avec les bons paramètres", () => {
      const data = {
        champ_123: "valeur1",
        champ_456: "valeur2",
      };

      const url = client.generatePrefillUrl(data);

      expect(url).toContain("https://api.test.fr/commencer/test-demarche");
      expect(url).toContain("champ_123=valeur1");
      expect(url).toContain("champ_456=valeur2");
    });

    it("devrait ignorer les valeurs null/undefined", () => {
      const data = {
        champ_123: "valeur1",
        champ_456: null,
        champ_789: undefined,
      };

      const url = client.generatePrefillUrl(data);

      expect(url).toContain("champ_123=valeur1");
      expect(url).not.toContain("champ_456");
      expect(url).not.toContain("champ_789");
    });
  });

  describe("validatePrefillData", () => {
    it("devrait détecter les clés invalides", () => {
      const data = {
        invalid_key: "value",
        champ_123: "value",
      };

      const errors = client.validatePrefillData(data);

      expect(errors).toContain(
        "Clé invalide: invalid_key. Les clés doivent commencer par 'champ_'"
      );
      expect(errors).not.toContain("champ_123");
    });
  });

  describe("createPrefillDossier", () => {
    it("devrait appeler l'API avec les bonnes données", async () => {
      const mockResponse = {
        dossier_url: "https://test.fr/dossier/123",
        dossier_id: "abc123",
        dossier_number: 123,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const data = { champ_123: "test" };
      const result = await client.createPrefillDossier(data);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.test.fr/api/public/v1/demarches/12345/dossiers",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it("devrait gérer les erreurs API", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: async () => "Champ requis manquant",
      });

      await expect(
        client.createPrefillDossier({ champ_123: "test" })
      ).rejects.toThrow("400 Bad Request");
    });
  });
});
