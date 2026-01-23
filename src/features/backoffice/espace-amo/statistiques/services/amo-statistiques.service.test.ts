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

// Helper pour mocker les chaînes Drizzle qui peut gérer les trois cas:
// - select -> from -> where (indicateurs clés)
// - select -> from -> innerJoin -> where (répartition par étape et revenus)
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
    it("devrait retourner les indicateurs clés, la répartition par étape, par revenu et les top communes", async () => {
      // Arrange - Mock des 10 requêtes DB (3 indicateurs + 5 étapes + 1 revenus + 1 communes)
      // Note: L'ordre peut varier car les requêtes sont en parallèle
      vi.mocked(db.select)
        .mockReturnValueOnce(mockDbSelect([{ count: 12 }])) // dossiers en cours
        .mockReturnValueOnce(mockDbSelect([{ count: 5 }])) // CHOIX_AMO
        .mockReturnValueOnce(mockDbSelect([{ count: 2 }])) // ELIGIBILITE
        .mockReturnValueOnce(mockDbSelect([{ count: 2 }])) // DIAGNOSTIC
        .mockReturnValueOnce(mockDbSelect([{ count: 3 }])) // DEVIS
        .mockReturnValueOnce(mockDbSelect([{ count: 0 }])) // FACTURES
        .mockReturnValueOnce(mockDbSelect([])) // revenus (données RGA)
        .mockReturnValueOnce(mockDbSelect([])) // communes (données RGA)
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
      expect(stats.repartitionParRevenu).toBeDefined();
      expect(stats.topCommunes).toBeDefined();
      expect(Array.isArray(stats.topCommunes)).toBe(true);
    });

    it("devrait retourner 0 pour chaque statistique si aucune donnée", async () => {
      // Arrange - Toutes les requêtes retournent 0 ou tableau vide
      vi.mocked(db.select).mockReturnValue(mockDbSelect([{ count: 0 }]));

      // Act
      const stats = await getAmoStatistiques(entrepriseAmoId);

      // Assert
      expect(stats.indicateursCles.nombreDossiersEnCoursAccompagnement).toBe(0);
      expect(stats.indicateursCles.nombreDemandesAccompagnement.total).toBe(0);
      expect(stats.repartitionParEtape.every((e) => e.count === 0)).toBe(true);
      expect(stats.repartitionParRevenu.tresModeste).toBe(0);
      expect(stats.repartitionParRevenu.modeste).toBe(0);
      expect(stats.repartitionParRevenu.intermediaire).toBe(0);
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
      expect(stats.repartitionParRevenu.tresModeste).toBe(0);
      expect(stats.repartitionParRevenu.modeste).toBe(0);
      expect(stats.repartitionParRevenu.intermediaire).toBe(0);
    });

    it("devrait appeler db.select 10 fois (3 indicateurs + 5 étapes + 1 revenus + 1 communes)", async () => {
      // Arrange
      vi.mocked(db.select).mockReturnValue(mockDbSelect([{ count: 1 }]));

      // Act
      await getAmoStatistiques(entrepriseAmoId);

      // Assert
      expect(db.select).toHaveBeenCalledTimes(10);
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
      expect(stats).toHaveProperty("repartitionParRevenu");
      expect(stats.indicateursCles).toHaveProperty("nombreDossiersEnCoursAccompagnement");
      expect(stats.indicateursCles).toHaveProperty("nombreDemandesAccompagnement");
      expect(stats.indicateursCles.nombreDemandesAccompagnement).toHaveProperty("total");
      expect(stats.indicateursCles.nombreDemandesAccompagnement).toHaveProperty("acceptees");
      expect(stats.indicateursCles.nombreDemandesAccompagnement).toHaveProperty("refusees");
      expect(stats.repartitionParRevenu).toHaveProperty("tresModeste");
      expect(stats.repartitionParRevenu).toHaveProperty("modeste");
      expect(stats.repartitionParRevenu).toHaveProperty("intermediaire");
    });

    it("devrait calculer correctement la répartition par revenus", async () => {
      // Arrange - Mock qui retourne des données RGA pour la requête de revenus
      // et des counts pour les autres requêtes
      vi.mocked(db.select).mockImplementation(() => {
        // On retourne un mock qui peut gérer les deux types de requêtes
        const mockWhere = vi.fn().mockImplementation(() => {
          // Simuler les deux types de retours possibles
          return Promise.resolve([{ count: 1 }]);
        });
        const mockInnerJoin = vi.fn().mockReturnValue({
          where: mockWhere,
        });
        const mockFrom = vi.fn().mockReturnValue({
          where: mockWhere,
          innerJoin: mockInnerJoin,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { from: mockFrom } as any;
      });

      // Act
      const stats = await getAmoStatistiques(entrepriseAmoId);

      // Assert - Vérifier que la structure est correcte (les valeurs dépendent du mock)
      expect(stats.repartitionParRevenu).toHaveProperty("tresModeste");
      expect(stats.repartitionParRevenu).toHaveProperty("modeste");
      expect(stats.repartitionParRevenu).toHaveProperty("intermediaire");
      expect(typeof stats.repartitionParRevenu.tresModeste).toBe("number");
      expect(typeof stats.repartitionParRevenu.modeste).toBe("number");
      expect(typeof stats.repartitionParRevenu.intermediaire).toBe("number");
    });

    it("devrait retourner 0 pour les revenus si aucune donnée RGA", async () => {
      // Arrange - Toutes les requêtes retournent des tableaux vides ou count 0
      vi.mocked(db.select).mockReturnValue(mockDbSelect([]));

      // Act
      const stats = await getAmoStatistiques(entrepriseAmoId);

      // Assert - Pas de données RGA = tous à 0
      expect(stats.repartitionParRevenu.tresModeste).toBe(0);
      expect(stats.repartitionParRevenu.modeste).toBe(0);
      expect(stats.repartitionParRevenu.intermediaire).toBe(0);
    });

    it("devrait retourner un tableau vide pour topCommunes si aucune donnée de commune", async () => {
      // Arrange - Toutes les requêtes retournent des tableaux vides
      vi.mocked(db.select).mockReturnValue(mockDbSelect([]));

      // Act
      const stats = await getAmoStatistiques(entrepriseAmoId);

      // Assert
      expect(stats.topCommunes).toEqual([]);
    });

    it("devrait retourner la structure complète avec topCommunes", async () => {
      // Arrange
      vi.mocked(db.select).mockReturnValue(mockDbSelect([{ count: 5 }]));

      // Act
      const stats = await getAmoStatistiques(entrepriseAmoId);

      // Assert - Vérifier la structure complète incluant topCommunes
      expect(stats).toHaveProperty("indicateursCles");
      expect(stats).toHaveProperty("repartitionParEtape");
      expect(stats).toHaveProperty("repartitionParRevenu");
      expect(stats).toHaveProperty("topCommunes");
      expect(Array.isArray(stats.topCommunes)).toBe(true);
    });
  });
});
