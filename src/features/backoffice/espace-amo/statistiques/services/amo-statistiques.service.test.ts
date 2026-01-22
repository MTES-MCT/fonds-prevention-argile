import { describe, it, expect, beforeEach, vi } from "vitest";
import { getAmoStatistiques } from "./amo-statistiques.service";
import { db } from "@/shared/database/client";
import { Step } from "@/shared/domain/value-objects/step.enum";

// Mock du client DB
vi.mock("@/shared/database/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

// Helper pour mocker les chaînes Drizzle qui peut gérer les deux cas:
// - select -> from -> where (indicateurs clés)
// - select -> from -> innerJoin -> where (répartition par étape)
const mockDbSelect = (data: unknown) => {
  const mockWhere = vi.fn().mockResolvedValue(data);
  const mockInnerJoin = vi.fn().mockReturnValue({
    where: mockWhere,
  });
  const mockFrom = vi.fn().mockReturnValue({
    where: mockWhere,
    innerJoin: mockInnerJoin,
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
    it("devrait retourner les indicateurs clés et la répartition par étape", async () => {
      // Arrange - Mock des 8 requêtes DB (3 indicateurs + 5 étapes)
      // Note: L'ordre peut varier car les requêtes sont en parallèle
      vi.mocked(db.select)
        .mockReturnValueOnce(mockDbSelect([{ count: 12 }])) // dossiers en cours
        .mockReturnValueOnce(mockDbSelect([{ count: 5 }])) // CHOIX_AMO
        .mockReturnValueOnce(mockDbSelect([{ count: 2 }])) // ELIGIBILITE
        .mockReturnValueOnce(mockDbSelect([{ count: 2 }])) // DIAGNOSTIC
        .mockReturnValueOnce(mockDbSelect([{ count: 3 }])) // DEVIS
        .mockReturnValueOnce(mockDbSelect([{ count: 0 }])) // FACTURES
        .mockReturnValueOnce(mockDbSelect([{ count: 12 }])) // acceptées
        .mockReturnValueOnce(mockDbSelect([{ count: 4 }])); // refusées

      // Act
      const stats = await getAmoStatistiques(entrepriseAmoId);

      // Assert - Vérifier la structure des résultats
      expect(stats.indicateursCles).toBeDefined();
      expect(stats.repartitionParEtape).toHaveLength(5);
      expect(stats.repartitionParEtape.map((e) => e.etape)).toEqual([
        Step.CHOIX_AMO,
        Step.ELIGIBILITE,
        Step.DIAGNOSTIC,
        Step.DEVIS,
        Step.FACTURES,
      ]);
    });

    it("devrait retourner 0 pour chaque statistique si aucune donnée", async () => {
      // Arrange - Toutes les requêtes retournent 0
      vi.mocked(db.select).mockReturnValue(mockDbSelect([{ count: 0 }]));

      // Act
      const stats = await getAmoStatistiques(entrepriseAmoId);

      // Assert
      expect(stats.indicateursCles.nombreDossiersEnCoursAccompagnement).toBe(0);
      expect(stats.indicateursCles.nombreDemandesAccompagnement.total).toBe(0);
      expect(stats.repartitionParEtape.every((e) => e.count === 0)).toBe(true);
    });

    it("devrait gérer les résultats vides avec le fallback ?? 0", async () => {
      // Arrange - Tableaux vides
      vi.mocked(db.select).mockReturnValue(mockDbSelect([]));

      // Act
      const stats = await getAmoStatistiques(entrepriseAmoId);

      // Assert - Devrait fallback à 0 grâce au ?? 0
      expect(stats.indicateursCles.nombreDossiersEnCoursAccompagnement).toBe(0);
      expect(stats.indicateursCles.nombreDemandesAccompagnement.total).toBe(0);
      expect(stats.repartitionParEtape.every((e) => e.count === 0)).toBe(true);
    });

    it("devrait appeler db.select 8 fois (3 indicateurs + 5 étapes)", async () => {
      // Arrange
      vi.mocked(db.select).mockReturnValue(mockDbSelect([{ count: 1 }]));

      // Act
      await getAmoStatistiques(entrepriseAmoId);

      // Assert
      expect(db.select).toHaveBeenCalledTimes(8);
    });

    it("devrait retourner les étapes dans le bon ordre avec les bons labels", async () => {
      // Arrange
      vi.mocked(db.select).mockReturnValue(mockDbSelect([{ count: 0 }]));

      // Act
      const stats = await getAmoStatistiques(entrepriseAmoId);

      // Assert - Vérifier l'ordre et les labels des étapes
      expect(stats.repartitionParEtape).toEqual([
        { etape: Step.CHOIX_AMO, label: "Choix AMO", count: 0 },
        { etape: Step.ELIGIBILITE, label: "Éligibilité", count: 0 },
        { etape: Step.DIAGNOSTIC, label: "Diagnostic", count: 0 },
        { etape: Step.DEVIS, label: "Devis", count: 0 },
        { etape: Step.FACTURES, label: "Factures", count: 0 },
      ]);
    });

    it("devrait retourner la structure complète des statistiques", async () => {
      // Arrange
      vi.mocked(db.select).mockReturnValue(mockDbSelect([{ count: 5 }]));

      // Act
      const stats = await getAmoStatistiques(entrepriseAmoId);

      // Assert - Vérifier la structure complète
      expect(stats).toHaveProperty("indicateursCles");
      expect(stats).toHaveProperty("repartitionParEtape");
      expect(stats.indicateursCles).toHaveProperty("nombreDossiersEnCoursAccompagnement");
      expect(stats.indicateursCles).toHaveProperty("nombreDemandesAccompagnement");
      expect(stats.indicateursCles.nombreDemandesAccompagnement).toHaveProperty("total");
      expect(stats.indicateursCles.nombreDemandesAccompagnement).toHaveProperty("acceptees");
      expect(stats.indicateursCles.nombreDemandesAccompagnement).toHaveProperty("refusees");
    });
  });
});
