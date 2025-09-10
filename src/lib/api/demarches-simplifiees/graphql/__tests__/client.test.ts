import { describe, it, expect, vi, beforeEach } from "vitest";
import { DemarchesSimplifieesClient } from "../client";

describe("DemarchesSimplifieesClient", () => {
  let client: DemarchesSimplifieesClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new DemarchesSimplifieesClient();
  });

  describe("getDemarcheDetailed", () => {
    it("devrait récupérer les détails d'une démarche", async () => {
      const mockResponse = {
        data: {
          demarche: {
            id: "demarche-123",
            number: 12345,
            title: "Test Démarche",
            state: "publiee",
            dateCreation: "2024-01-01",
            service: {
              id: "service-1",
              nom: "Service Test",
              organisme: "Organisme Test",
              typeOrganisme: "collectivite",
            },
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.getDemarcheDetailed(12345);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.test.fr/api/v2/graphql",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-api-key",
          },
          body: expect.stringContaining("GetDemarcheDetailed"),
        })
      );

      expect(result).toEqual(mockResponse.data.demarche);
    });

    it("devrait retourner null en cas d'erreur", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await client.getDemarcheDetailed(12345);

      expect(result).toBeNull();
    });
  });

  describe("getDemarcheDossiers", () => {
    it("devrait récupérer les dossiers avec pagination", async () => {
      const mockDossiers = {
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: "start",
          endCursor: "end",
        },
        nodes: [
          {
            id: "dossier-1",
            number: 1,
            state: "en_construction",
            archived: false,
            usager: { email: "test@example.com" },
          },
        ],
      };

      const mockResponse = {
        data: {
          demarche: {
            dossiers: mockDossiers,
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.getDemarcheDossiers(12345, { first: 50 });

      expect(fetch).toHaveBeenCalled();
      const callArgs = (fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.variables).toEqual({
        number: 12345,
        first: 50,
      });

      expect(result).toEqual(mockDossiers);
    });
  });

  describe("error handling", () => {
    it("devrait gérer les erreurs GraphQL", async () => {
      const mockResponse = {
        errors: [
          { message: "Démarche non trouvée" },
          { message: "Accès refusé" },
        ],
        data: null,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(client.customQuery("query { test }")).rejects.toThrow(
        "GraphQL errors: Démarche non trouvée, Accès refusé"
      );
    });
  });
});
