import { describe, it, expect, vi, beforeEach, MockedFunction } from "vitest";

// Mock getServerEnv AVANT l'import du client
vi.mock("@/shared/config/env.config", () => ({
  getServerEnv: vi.fn(() => ({
    DEMARCHES_SIMPLIFIEES_REST_API_URL: "https://www.demarches-simplifiees.fr/api/public/v1",
    DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE: "123456",
    DEMARCHES_SIMPLIFIEES_ID_DIAGNOSTIC: "123457",
    DEMARCHES_SIMPLIFIEES_ID_DEVIS: "123458",
    DEMARCHES_SIMPLIFIEES_ID_FACTURES: "123459",
  })),
  isClient: vi.fn(() => false),
  isServer: vi.fn(() => true),
}));

import { DemarchesSimplifieesPrefillClient } from "../client";
import { Step } from "@/features/parcours/core";

describe("DemarchesSimplifieesPrefillClient", () => {
  let client: DemarchesSimplifieesPrefillClient;
  const mockFetch = global.fetch as MockedFunction<typeof fetch>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new DemarchesSimplifieesPrefillClient();
  });

  describe("createPrefillDossier", () => {
    it("devrait créer un dossier prérempli", async () => {
      const mockResponse = {
        dossier_url: "https://www.demarches-simplifiees.fr/dossiers/123",
        dossier_number: 123,
        dossier_id: "dossier-123",
        state: "en_construction",
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          statusText: "OK",
          headers: new Headers({ "Content-Type": "application/json" }),
        })
      );

      const prefillData = {
        champ_1: "test value",
        champ_2: 42,
      };

      const result = await client.createPrefillDossier(prefillData, Step.ELIGIBILITE);

      expect(fetch).toHaveBeenCalledWith(
        "https://www.demarches-simplifiees.fr/api/public/v1/demarches/123456/dossiers",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(prefillData),
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe("validatePrefillData", () => {
    it("devrait valider les données de préremplissage", () => {
      const data = {
        champ_1: "test",
        invalid_key: "value",
      };

      const errors = client.validatePrefillData(data);

      expect(errors).toContain("Clé invalide: invalid_key. Les clés doivent commencer par 'champ_'");
    });
  });

  describe("getDemarcheId", () => {
    it("devrait retourner l'ID de démarche pour une étape", () => {
      const demarcheId = client.getDemarcheId(Step.ELIGIBILITE);
      expect(demarcheId).toBe("123456");
    });
  });
});
