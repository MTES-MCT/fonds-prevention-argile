import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanupRGADataAfterDS } from "./cleanup.service";
import { RGADeletionReason } from "../domain/types/rga-simulation.types";
import type { ParcoursPrevention } from "@/shared/database/schema/parcours-prevention";

// Mock du repository
vi.mock("@/shared/database/repositories", () => ({
  parcoursRepo: {
    deleteRGAData: vi.fn(),
  },
}));

// Import après le mock
import { parcoursRepo } from "@/shared/database/repositories";

describe("cleanupRGADataAfterDS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.log et console.error pour éviter le spam dans les tests
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("Succès", () => {
    it("devrait supprimer les données RGA avec succès", async () => {
      const parcoursId = "test-parcours-id";
      const mockParcours: Partial<ParcoursPrevention> = {
        id: parcoursId,
        rgaSimulationData: null,
        rgaDataDeletedAt: new Date(),
        rgaDataDeletionReason: RGADeletionReason.SENT_TO_DS,
      };

      vi.mocked(parcoursRepo.deleteRGAData).mockResolvedValue(
        mockParcours as ParcoursPrevention
      );

      const result = await cleanupRGADataAfterDS(parcoursId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeUndefined();
      }
      expect(parcoursRepo.deleteRGAData).toHaveBeenCalledWith(
        parcoursId,
        RGADeletionReason.SENT_TO_DS
      );
      expect(parcoursRepo.deleteRGAData).toHaveBeenCalledTimes(1);
    });

    it("devrait logger le début et la fin du processus", async () => {
      const parcoursId = "test-parcours-id";
      const mockParcours: Partial<ParcoursPrevention> = {
        id: parcoursId,
        rgaSimulationData: null,
      };

      vi.mocked(parcoursRepo.deleteRGAData).mockResolvedValue(
        mockParcours as ParcoursPrevention
      );

      await cleanupRGADataAfterDS(parcoursId);

      expect(console.log).toHaveBeenCalledWith(
        `[Cleanup] Suppression des données RGA pour le parcours ${parcoursId}`
      );
      expect(console.log).toHaveBeenCalledWith(
        `[Cleanup] Données RGA supprimées avec succès pour le parcours ${parcoursId}`
      );
    });
  });

  describe("Erreurs", () => {
    it("devrait retourner une erreur si le parcours n'existe pas", async () => {
      const parcoursId = "parcours-inexistant";

      vi.mocked(parcoursRepo.deleteRGAData).mockResolvedValue(null);

      const result = await cleanupRGADataAfterDS(parcoursId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Parcours non trouvé");
      }
      expect(console.error).toHaveBeenCalledWith(
        `[Cleanup] Parcours ${parcoursId} non trouvé ou suppression échouée`
      );
    });

    it("devrait gérer les erreurs du repository", async () => {
      const parcoursId = "test-parcours-id";
      const errorMessage = "Erreur base de données";

      vi.mocked(parcoursRepo.deleteRGAData).mockRejectedValue(
        new Error(errorMessage)
      );

      const result = await cleanupRGADataAfterDS(parcoursId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(errorMessage);
      }
      expect(console.error).toHaveBeenCalledWith(
        `[Cleanup] Erreur lors de la suppression des données RGA:`,
        expect.any(Error)
      );
    });

    it("devrait gérer les erreurs non-Error", async () => {
      const parcoursId = "test-parcours-id";

      vi.mocked(parcoursRepo.deleteRGAData).mockRejectedValue(
        "Erreur inconnue"
      );

      const result = await cleanupRGADataAfterDS(parcoursId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "Erreur lors de la suppression des données RGA"
        );
      }
    });
  });

  describe("Cas edge", () => {
    it("devrait gérer un parcoursId vide", async () => {
      const parcoursId = "";

      vi.mocked(parcoursRepo.deleteRGAData).mockResolvedValue(null);

      const result = await cleanupRGADataAfterDS(parcoursId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Parcours non trouvé");
      }
      expect(parcoursRepo.deleteRGAData).toHaveBeenCalledWith(
        "",
        RGADeletionReason.SENT_TO_DS
      );
    });

    it("devrait toujours utiliser RGADeletionReason.SENT_TO_DS", async () => {
      const parcoursId = "test-parcours-id";
      const mockParcours: Partial<ParcoursPrevention> = {
        id: parcoursId,
        rgaDataDeletionReason: RGADeletionReason.SENT_TO_DS,
      };

      vi.mocked(parcoursRepo.deleteRGAData).mockResolvedValue(
        mockParcours as ParcoursPrevention
      );

      await cleanupRGADataAfterDS(parcoursId);

      const calls = vi.mocked(parcoursRepo.deleteRGAData).mock.calls;
      expect(calls[0][1]).toBe(RGADeletionReason.SENT_TO_DS);
    });
  });
});
