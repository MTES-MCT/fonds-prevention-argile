import { describe, it, expect, vi, beforeEach, MockedFunction } from "vitest";
import { DemarchesSimplifieesPrefillClient } from "../client";
import { Step } from "@/lib/parcours/parcours.types";
import { DemarcheSchema } from "../types";

describe("DemarchesSimplifieesPrefillClient", () => {
  let client: DemarchesSimplifieesPrefillClient;
  const mockFetch = global.fetch as MockedFunction<typeof fetch>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new DemarchesSimplifieesPrefillClient();
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

    it("devrait valider avec un schéma", () => {
      const schema = {
        id: "123",
        revision: {
          champDescriptors: [
            { id: "champ_123", label: "Test", required: true },
            { id: "champ_456", label: "Test2", required: false },
          ],
        },
      } as DemarcheSchema;

      const data = {
        champ_456: "value",
      };

      const errors = client.validatePrefillData(data, schema);

      expect(errors).toContain("Champ requis manquant: Test");
    });
  });

  describe("createPrefillDossier", () => {
    it("devrait appeler l'API avec les bonnes données pour ELIGIBILITE", async () => {
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
      const result = await client.createPrefillDossier(data, Step.ELIGIBILITE);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.test.fr/api/public/v1/demarches/test-id-eligibilite/dossiers",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it("devrait utiliser l'ID correct pour DIAGNOSTIC", async () => {
      const mockResponse = {
        dossier_url: "https://test.fr/dossier/456",
        dossier_id: "def456",
        dossier_number: 456,
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          statusText: "OK",
          headers: new Headers({ "Content-Type": "application/json" }),
        })
      );

      const data = { champ_789: "diagnostic" };
      const result = await client.createPrefillDossier(data, Step.DIAGNOSTIC);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.test.fr/api/public/v1/demarches/test-id-diagnostic/dossiers",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it("devrait gérer les erreurs API", async () => {
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
        client.createPrefillDossier({ champ_123: "test" }, Step.ELIGIBILITE)
      ).rejects.toThrow(
        "Erreur création dossier ELIGIBILITE: 400 Bad Request - Champ requis manquant"
      );
    });
  });

  describe("getDemarcheId", () => {
    it("devrait retourner l'ID pour une étape", () => {
      const id = client.getDemarcheId(Step.ELIGIBILITE);
      expect(id).toBe("test-id-eligibilite");
    });

    it("devrait retourner l'ID pour un type de démarche", () => {
      const id = client.getDemarcheId("FACTURES");
      expect(id).toBe("test-id-factures");
    });
  });

  describe("getSchema", () => {
    it("devrait récupérer le schéma pour une démarche", async () => {
      const mockSchema = {
        id: "123",
        title: "Test",
        revision: { champDescriptors: [] },
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockSchema), {
          status: 200,
          headers: new Headers({ "Content-Type": "application/json" }),
        })
      );

      const result = await client.getSchema(Step.DEVIS);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.test.fr/preremplir/test-nom-devis/schema",
        expect.objectContaining({
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        })
      );

      expect(result).toEqual(mockSchema);
    });
  });
});
