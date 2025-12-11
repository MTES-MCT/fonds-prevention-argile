import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { catnatService } from "./catnat.service";
import { catastrophesNaturellesRepository } from "@/shared/database/repositories";
import * as georisquesAdapter from "../adapters/georisques";
import {
  mockApiCatnatRecent,
  mockApiCatnatOld,
  mockApiCatnatInondation,
  mockDbCatnat,
  mockApiCatnatSecheresse2,
} from "@/shared/testing/mocks/catnat.mocks";
import * as utils from "@/shared/utils";

// Mock des modules
vi.mock("../adapters/georisques");
vi.mock("@/shared/database/repositories");
vi.mock("@/shared/utils", async () => {
  const actual = await vi.importActual("@/shared/utils");
  return {
    ...actual,
    delay: vi.fn().mockResolvedValue(undefined),
  };
});

describe("catnatService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("transformApiToDb", () => {
    it("should transform API format to DB format", () => {
      const result = catnatService.transformApiToDb(mockApiCatnatRecent);

      expect(result).toEqual({
        codeNationalCatnat: "INTE2400123A",
        dateDebutEvt: "2024-06-01",
        dateFinEvt: "2024-06-30",
        datePublicationArrete: "2024-07-15",
        datePublicationJo: "2024-07-20",
        libelleRisqueJo: "Sécheresse",
        codeInsee: "63113",
        libelleCommune: "CLERMONT-FERRAND",
      });
    });

    it("should handle different date formats correctly", () => {
      const result = catnatService.transformApiToDb(mockApiCatnatInondation);

      expect(result.dateDebutEvt).toBe("2023-11-15");
      expect(result.dateFinEvt).toBe("2023-11-20");
    });
  });

  describe("filterByYears", () => {
    it("should keep recent catastrophes (< 20 years)", () => {
      const result = catnatService.filterByYears([mockApiCatnatRecent], 20);

      expect(result).toHaveLength(1);
      expect(result[0].code_national_catnat).toBe("INTE2400123A");
    });

    it("should filter out old catastrophes (> 20 years)", () => {
      const result = catnatService.filterByYears([mockApiCatnatOld], 20);

      expect(result).toHaveLength(0);
    });

    it("should filter mixed old and recent catastrophes", () => {
      const result = catnatService.filterByYears([mockApiCatnatRecent, mockApiCatnatOld, mockApiCatnatInondation], 20);

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.code_national_catnat)).toEqual(["INTE2400123A", "INTE2300456B"]);
    });

    it("should use custom year filter", () => {
      const result = catnatService.filterByYears([mockApiCatnatInondation], 1);

      // mockApiCatnatInondation est de 2023, donc > 1 an
      expect(result).toHaveLength(0);
    });
  });

  describe("filterByRGA", () => {
    it("should keep only sécheresse catastrophes", () => {
      const result = catnatService.filterByRGA([mockApiCatnatRecent, mockApiCatnatInondation]);

      expect(result).toHaveLength(1);
      expect(result[0].libelle_risque_jo).toBe("Sécheresse");
    });

    it("should filter out non-RGA catastrophes", () => {
      const result = catnatService.filterByRGA([mockApiCatnatInondation]);

      expect(result).toHaveLength(0);
    });

    it("should be case insensitive", () => {
      const catnatWithDifferentCase = {
        ...mockApiCatnatRecent,
        libelle_risque_jo: "SÉCHERESSE ET RÉHYDRATATION DES SOLS",
      };

      const result = catnatService.filterByRGA([catnatWithDifferentCase]);

      expect(result).toHaveLength(1);
    });
  });

  describe("filterForRGA", () => {
    it("should filter by RGA type and years", () => {
      const result = catnatService.filterForRGA([mockApiCatnatRecent, mockApiCatnatOld, mockApiCatnatInondation], 20);

      // mockApiCatnatRecent: Sécheresse + récent = OK
      // mockApiCatnatOld: Sécheresse + > X années = KO
      // mockApiCatnatInondation: Pas sécheresse = KO
      expect(result).toHaveLength(1);
      expect(result[0].code_national_catnat).toBe("INTE2400123A");
    });
  });

  describe("importForCommune", () => {
    it("should successfully import catastrophes for a commune", async () => {
      vi.mocked(georisquesAdapter.fetchCatnatByCodeInsee).mockResolvedValue([mockApiCatnatRecent]);
      vi.mocked(catastrophesNaturellesRepository.batchUpsert).mockResolvedValue(undefined);

      const result = await catnatService.importForCommune("63113");

      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(georisquesAdapter.fetchCatnatByCodeInsee).toHaveBeenCalledWith("63113");
      expect(catastrophesNaturellesRepository.batchUpsert).toHaveBeenCalledTimes(1);
    });

    it("should skip old and non-RGA catastrophes", async () => {
      vi.mocked(georisquesAdapter.fetchCatnatByCodeInsee).mockResolvedValue([
        mockApiCatnatRecent, // Sécheresse récente → importée
        mockApiCatnatOld, // Sécheresse > X années → ignorée
        mockApiCatnatInondation, // Inondation → ignorée
      ]);
      vi.mocked(catastrophesNaturellesRepository.batchUpsert).mockResolvedValue(undefined);

      const result = await catnatService.importForCommune("63113");

      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(2); // 1 vieille + 1 inondation
    });

    it("should handle commune with no catastrophes", async () => {
      vi.mocked(georisquesAdapter.fetchCatnatByCodeInsee).mockResolvedValue([]);

      const result = await catnatService.importForCommune("63113");

      expect(result.success).toBe(true);
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(0);
      expect(catastrophesNaturellesRepository.batchUpsert).not.toHaveBeenCalled();
    });

    it("should handle commune with only non-RGA catastrophes", async () => {
      vi.mocked(georisquesAdapter.fetchCatnatByCodeInsee).mockResolvedValue([mockApiCatnatInondation]);

      const result = await catnatService.importForCommune("63113");

      expect(result.success).toBe(true);
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(catastrophesNaturellesRepository.batchUpsert).not.toHaveBeenCalled();
    });

    it("should handle API errors", async () => {
      vi.mocked(georisquesAdapter.fetchCatnatByCodeInsee).mockRejectedValue(new Error("API Error"));

      const result = await catnatService.importForCommune("63113");

      expect(result.success).toBe(false);
      expect(result.error).toBe("API Error");
      expect(result.imported).toBe(0);
    });

    it("should handle database errors", async () => {
      vi.mocked(georisquesAdapter.fetchCatnatByCodeInsee).mockResolvedValue([mockApiCatnatRecent]);
      vi.mocked(catastrophesNaturellesRepository.batchUpsert).mockRejectedValue(new Error("DB Error"));

      const result = await catnatService.importForCommune("63113");

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB Error");
    });
  });

  describe("importForCommunes", () => {
    it("should import catastrophes for multiple communes", async () => {
      // Utiliser 2 sécheresses au lieu de sécheresse + inondation
      vi.mocked(georisquesAdapter.fetchCatnatByCodesInsee).mockResolvedValue([
        mockApiCatnatRecent,
        mockApiCatnatSecheresse2,
      ]);
      vi.mocked(catastrophesNaturellesRepository.batchUpsert).mockResolvedValue(undefined);

      const result = await catnatService.importForCommunes(["63113", "07186"]);

      expect(result.totalCommunes).toBe(2);
      expect(result.communesSuccess).toBe(2);
      expect(result.communesFailed).toBe(0);
      expect(result.catnatImported).toBe(2); // Maintenant ça passe
      expect(georisquesAdapter.fetchCatnatByCodesInsee).toHaveBeenCalledWith(["63113", "07186"]);
    });

    // Ajouter un nouveau test pour vérifier le filtrage
    it("should filter out non-RGA catastrophes during import", async () => {
      vi.mocked(georisquesAdapter.fetchCatnatByCodesInsee).mockResolvedValue([
        mockApiCatnatRecent, // Sécheresse → importée
        mockApiCatnatInondation, // Inondation → filtrée
      ]);
      vi.mocked(catastrophesNaturellesRepository.batchUpsert).mockResolvedValue(undefined);

      const result = await catnatService.importForCommunes(["63113", "07186"]);

      expect(result.totalCatnat).toBe(2); // 2 trouvées au total
      expect(result.catnatImported).toBe(1); // 1 sécheresse importée
      expect(result.catnatSkipped).toBe(1); // 1 inondation ignorée
    });

    it("should handle batching (> 10 communes)", async () => {
      const codesInsee = Array.from({ length: 25 }, (_, i) => `6311${i}`);
      vi.mocked(georisquesAdapter.fetchCatnatByCodesInsee).mockResolvedValue([mockApiCatnatRecent]); // Sécheresse uniquement
      vi.mocked(catastrophesNaturellesRepository.batchUpsert).mockResolvedValue(undefined);

      await catnatService.importForCommunes(codesInsee);

      // 25 communes = 3 batches (10 + 10 + 5)
      expect(georisquesAdapter.fetchCatnatByCodesInsee).toHaveBeenCalledTimes(3);
      expect(utils.delay).toHaveBeenCalledTimes(2); // Entre les batches
    });

    it("should call progress callback", async () => {
      vi.mocked(georisquesAdapter.fetchCatnatByCodesInsee).mockResolvedValue([mockApiCatnatRecent]); // Sécheresse uniquement
      vi.mocked(catastrophesNaturellesRepository.batchUpsert).mockResolvedValue(undefined);

      const progressCallback = vi.fn();
      await catnatService.importForCommunes(["63113", "07186"], progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          communesProcessed: 2,
          communesSuccess: 2,
        })
      );
    });

    it("should handle batch errors", async () => {
      vi.mocked(georisquesAdapter.fetchCatnatByCodesInsee).mockRejectedValue(new Error("Batch Error"));

      const result = await catnatService.importForCommunes(["63113", "07186"]);

      expect(result.communesFailed).toBe(2);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].error).toBe("Batch Error");
    });

    it("should handle empty communes array", async () => {
      const result = await catnatService.importForCommunes([]);

      expect(result.totalCommunes).toBe(0);
      expect(georisquesAdapter.fetchCatnatByCodesInsee).not.toHaveBeenCalled();
    });
  });

  describe("countForCommune", () => {
    it("should count catastrophes for a commune", async () => {
      vi.mocked(catastrophesNaturellesRepository.findByCodeInsee).mockResolvedValue([mockDbCatnat, mockDbCatnat]);

      const result = await catnatService.countForCommune("63113");

      expect(result).toBe(2);
      expect(catastrophesNaturellesRepository.findByCodeInsee).toHaveBeenCalledWith("63113");
    });
  });

  describe("getForCommune", () => {
    it("should get catastrophes for a commune", async () => {
      vi.mocked(catastrophesNaturellesRepository.findByCodeInsee).mockResolvedValue([mockDbCatnat]);

      const result = await catnatService.getForCommune("63113");

      expect(result).toHaveLength(1);
      expect(result[0].codeInsee).toBe("63113");
    });
  });

  describe("getTotalForDepartement", () => {
    it("should get total catastrophes for a department", async () => {
      vi.mocked(catastrophesNaturellesRepository.getTotalByDepartement).mockResolvedValue(42);

      const result = await catnatService.getTotalForDepartement("63");

      expect(result).toBe(42);
      expect(catastrophesNaturellesRepository.getTotalByDepartement).toHaveBeenCalledWith("63");
    });
  });

  describe("getStatsByTypeForCommune", () => {
    it("should get stats by risk type", async () => {
      const mockStats = [
        { libelleRisqueJo: "Sécheresse", count: 10 },
        { libelleRisqueJo: "Inondations et coulées de boue", count: 5 },
      ];
      vi.mocked(catastrophesNaturellesRepository.getStatsByTypeForCommune).mockResolvedValue(mockStats);

      const result = await catnatService.getStatsByTypeForCommune("63113");

      expect(result).toEqual(mockStats);
    });
  });
});
