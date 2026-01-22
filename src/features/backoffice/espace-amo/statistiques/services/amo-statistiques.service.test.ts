import { describe, it, expect, beforeEach, vi } from "vitest";
import { getAmoStatistiques } from "./amo-statistiques.service";
import { db } from "@/shared/database/client";

// Mock du client DB
vi.mock("@/shared/database/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

// Helper pour mocker les chaînes Drizzle avec where (select -> from -> where)
const mockDbSelectWithWhere = (data: unknown) => {
  const mockWhere = vi.fn().mockResolvedValue(data);
  const mockFrom = vi.fn().mockReturnValue({
    where: mockWhere,
  });

  return {
    from: mockFrom,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
};

describe("AmoStatistiquesService", () => {
  const entrepriseAmoId = "entreprise-amo-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAmoStatistiques", () => {
    it("devrait retourner les indicateurs clés pour une entreprise AMO", async () => {
      // Arrange - Mock des 3 requêtes DB
      vi.mocked(db.select)
        // 1. getNombreDossiersEnCoursAccompagnement (LOGEMENT_ELIGIBLE)
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 12 }]))
        // 2. getDemandesAccompagnement - acceptées
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 12 }]))
        // 3. getDemandesAccompagnement - refusées
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 4 }]));

      // Act
      const stats = await getAmoStatistiques(entrepriseAmoId);

      // Assert
      expect(stats).toEqual({
        indicateursCles: {
          nombreDossiersEnCoursAccompagnement: 12,
          nombreDemandesAccompagnement: {
            total: 16,
            acceptees: 12,
            refusees: 4,
          },
        },
      });
    });

    it("devrait retourner 0 pour chaque statistique si aucune donnée", async () => {
      // Arrange
      vi.mocked(db.select)
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 0 }]))
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 0 }]))
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 0 }]));

      // Act
      const stats = await getAmoStatistiques(entrepriseAmoId);

      // Assert
      expect(stats.indicateursCles.nombreDossiersEnCoursAccompagnement).toBe(0);
      expect(stats.indicateursCles.nombreDemandesAccompagnement.total).toBe(0);
      expect(stats.indicateursCles.nombreDemandesAccompagnement.acceptees).toBe(0);
      expect(stats.indicateursCles.nombreDemandesAccompagnement.refusees).toBe(0);
    });

    it("devrait gérer les résultats vides avec le fallback ?? 0", async () => {
      // Arrange - Tableaux vides
      vi.mocked(db.select)
        .mockReturnValueOnce(mockDbSelectWithWhere([]))
        .mockReturnValueOnce(mockDbSelectWithWhere([]))
        .mockReturnValueOnce(mockDbSelectWithWhere([]));

      // Act
      const stats = await getAmoStatistiques(entrepriseAmoId);

      // Assert - Devrait fallback à 0 grâce au ?? 0
      expect(stats.indicateursCles.nombreDossiersEnCoursAccompagnement).toBe(0);
      expect(stats.indicateursCles.nombreDemandesAccompagnement.total).toBe(0);
    });

    it("devrait appeler db.select 3 fois", async () => {
      // Arrange
      vi.mocked(db.select)
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 5 }]))
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 5 }]))
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 2 }]));

      // Act
      await getAmoStatistiques(entrepriseAmoId);

      // Assert
      expect(db.select).toHaveBeenCalledTimes(3);
    });

    it("devrait calculer le total des demandes correctement", async () => {
      // Arrange - 8 acceptées + 3 refusées = 11 total
      vi.mocked(db.select)
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 8 }]))
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 8 }]))
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 3 }]));

      // Act
      const stats = await getAmoStatistiques(entrepriseAmoId);

      // Assert
      expect(stats.indicateursCles.nombreDemandesAccompagnement.total).toBe(11);
      expect(stats.indicateursCles.nombreDemandesAccompagnement.acceptees).toBe(8);
      expect(stats.indicateursCles.nombreDemandesAccompagnement.refusees).toBe(3);
    });
  });
});
