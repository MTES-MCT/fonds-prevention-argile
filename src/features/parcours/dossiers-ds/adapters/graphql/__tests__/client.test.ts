import { describe, it, expect, vi, beforeEach, MockedFunction } from "vitest";

// Mock getServerEnv AVANT l'import du client
vi.mock("@/shared/config/env.config", () => ({
  getServerEnv: vi.fn(() => ({
    DEMARCHES_SIMPLIFIEES_GRAPHQL_API_URL: "https://api.test.fr/api/v2/graphql",
    DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY: "test-api-key",
  })),
  isClient: vi.fn(() => false),
  isServer: vi.fn(() => true),
}));

import { DemarchesSimplifieesClient } from "../client";
import { FIXTURES_AVIS_IMPOT } from "../../../mappers/avis-impot.fixtures";

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

  describe("getDossierAvisImpot", () => {
    const repondre = (body: unknown) =>
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: new Headers({ "Content-Type": "application/json" }),
        })
      );

    it("demande les colonnes des avis sans les noms de fichier, et renvoie le dossier", async () => {
      const dossier = FIXTURES_AVIS_IMPOT.lu;
      repondre({ data: { dossier } });

      const result = await client.getDossierAvisImpot(1);

      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(body.variables).toEqual({ number: 1 });
      expect(body.query).toContain("fragment PieceAvisImpot on PieceJustificativeChamp");
      expect(body.query).toContain("... on RepetitionChamp");
      expect(body.query).not.toContain("filename");
      expect(result).toEqual(dossier);
    });

    it("renvoie null quand DN ne renvoie pas de dossier", async () => {
      repondre({ data: { dossier: null } });

      await expect(client.getDossierAvisImpot(1)).resolves.toBeNull();
    });
  });

  describe("modifierAnnotations", () => {
    const input = {
      dossierId: "RG9zc2llci0x",
      instructeurId: "SW5zdHJ1Y3RldXItMQ==",
      annotations: [{ id: "Q2hhbXAtMQ==", value: { textarea: "Cohérent" } }],
    };
    const repondre = (body: unknown) =>
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: new Headers({ "Content-Type": "application/json" }),
        })
      );

    it("envoie la mutation dossierModifierAnnotations", async () => {
      repondre({ data: { dossierModifierAnnotations: { errors: null } } });

      await client.modifierAnnotations(input);

      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(body.query).toContain("dossierModifierAnnotations(input: $input)");
      expect(body.variables).toEqual({ input });
    });

    it("lève une erreur quand DN refuse dans le payload", async () => {
      repondre({ data: { dossierModifierAnnotations: { errors: [{ message: "Instructeur inconnu" }] } } });

      await expect(client.modifierAnnotations(input)).rejects.toThrow("Annotations refusées : Instructeur inconnu");
    });
  });

  describe("error handling", () => {
    it("devrait gérer les erreurs GraphQL", async () => {
      const mockResponse = {
        errors: [{ message: "Démarche non trouvée" }, { message: "Accès refusé" }],
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
