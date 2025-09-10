import { describe, it, expect, vi, beforeEach, MockedFunction } from "vitest";
import { DemarchesSimplifieesPrefillClient } from "../client";

describe("DemarchesSimplifieesPrefillClient", () => {
  let client: DemarchesSimplifieesPrefillClient;
  const mockFetch = global.fetch as MockedFunction<typeof fetch>;

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

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          statusText: "OK",
          headers: new Headers({ "Content-Type": "application/json" }),
        })
      );

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
      // Mock une réponse d'erreur avec le bon format
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: vi.fn().mockRejectedValue(new Error("Not JSON")),
        text: vi.fn().mockResolvedValue("Champ requis manquant"),
        headers: new Headers(),
        redirected: false,
        type: "basic",
        url: "",
        clone: vi.fn(),
        body: null,
        bodyUsed: false,
        arrayBuffer: vi.fn(),
        blob: vi.fn(),
        formData: vi.fn(),
      } as unknown as Response);

      await expect(
        client.createPrefillDossier({ champ_123: "test" })
      ).rejects.toThrow(
        "Erreur lors de la création du dossier: 400 Bad Request - Champ requis manquant"
      );
    });
  });
});
