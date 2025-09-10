import { describe, it, expect, vi, beforeEach, MockedFunction } from "vitest";
import { DemarchesSimplifieesClient } from "../client";

describe("DemarchesSimplifieesClient", () => {
  let client: DemarchesSimplifieesClient;
  const mockFetch = global.fetch as MockedFunction<typeof fetch>;

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

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          statusText: "OK",
          headers: new Headers({ "Content-Type": "application/json" }),
        })
      );

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
      mockFetch.mockResolvedValueOnce(
        new Response(null, {
          status: 500,
          statusText: "Internal Server Error",
        })
      );

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

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          statusText: "OK",
          headers: new Headers({ "Content-Type": "application/json" }),
        })
      );

      const result = await client.getDemarcheDossiers(12345, { first: 50 });

      expect(fetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

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

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          statusText: "OK",
          headers: new Headers({ "Content-Type": "application/json" }),
        })
      );

      await expect(client.customQuery("query { test }")).rejects.toThrow(
        "GraphQL errors: Démarche non trouvée, Accès refusé"
      );
    });
  });
});
