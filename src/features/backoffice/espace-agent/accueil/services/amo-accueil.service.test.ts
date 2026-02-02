import { describe, it, expect, beforeEach, vi } from "vitest";
import { getAmoAccueilData } from "./amo-accueil.service";
import { db } from "@/shared/database/client";

// Mock du client DB
vi.mock("@/shared/database/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

// Helper pour mocker les chaînes Drizzle
const mockDbSelectCount = (countValue: number) => {
  const mockWhere = vi.fn().mockResolvedValue([{ count: countValue }]);
  const mockFrom = vi.fn().mockReturnValue({
    where: mockWhere,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from: mockFrom } as any;
};

// Helper pour mocker les résultats avec innerJoin et orderBy
const mockDbSelectList = (data: unknown[]) => {
  const mockOrderBy = vi.fn().mockResolvedValue(data);
  const mockWhere = vi.fn().mockReturnValue({
    orderBy: mockOrderBy,
  });
  const mockInnerJoin = vi.fn().mockReturnValue({
    where: mockWhere,
  });
  const mockFrom = vi.fn().mockReturnValue({
    innerJoin: mockInnerJoin,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from: mockFrom } as any;
};

// Helper pour créer des données mock de demande
const createMockDemande = (
  id: string,
  prenom: string,
  nom: string,
  communeNom?: string,
  codeDepartement?: string
) => ({
  id,
  prenom,
  nom,
  createdAt: new Date("2024-01-15"),
  rgaSimulationData: {
    logement: {
      ...(communeNom && { commune_nom: communeNom }),
      ...(codeDepartement && { code_departement: codeDepartement }),
    },
  },
});

describe("AmoAccueilService", () => {
  const entrepriseAmoId = "entreprise-amo-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAmoAccueilData", () => {
    it("devrait retourner les données d'accueil complètes", async () => {
      // Arrange - Mock des 3 requêtes DB
      vi.mocked(db.select)
        .mockReturnValueOnce(mockDbSelectCount(6)) // demandes en attente
        .mockReturnValueOnce(mockDbSelectCount(12)) // dossiers suivis
        .mockReturnValueOnce(
          mockDbSelectList([
            createMockDemande("1", "Sophie", "Dubois", "Le Poinçonnet", "36"),
            createMockDemande("2", "Marc", "Lefèvre", "Déols", "36"),
          ])
        ); // liste des demandes

      // Act
      const result = await getAmoAccueilData(entrepriseAmoId);

      // Assert
      expect(result.nombreDemandesEnAttente).toBe(6);
      expect(result.nombreDossiersSuivis).toBe(12);
      expect(result.demandesATraiter).toHaveLength(2);
      expect(result.demandesATraiter[0]).toEqual({
        id: "1",
        prenom: "Sophie",
        nom: "Dubois",
        commune: "Le Poinçonnet",
        codePostal: "36",
        dateCreation: new Date("2024-01-15"),
      });
    });

    it("devrait retourner 0 pour chaque compteur si aucune donnée", async () => {
      // Arrange
      vi.mocked(db.select)
        .mockReturnValueOnce(mockDbSelectCount(0)) // demandes en attente
        .mockReturnValueOnce(mockDbSelectCount(0)) // dossiers suivis
        .mockReturnValueOnce(mockDbSelectList([])); // liste vide

      // Act
      const result = await getAmoAccueilData(entrepriseAmoId);

      // Assert
      expect(result.nombreDemandesEnAttente).toBe(0);
      expect(result.nombreDossiersSuivis).toBe(0);
      expect(result.demandesATraiter).toEqual([]);
    });

    it("devrait gérer les demandes sans données de commune", async () => {
      // Arrange
      vi.mocked(db.select)
        .mockReturnValueOnce(mockDbSelectCount(1))
        .mockReturnValueOnce(mockDbSelectCount(0))
        .mockReturnValueOnce(
          mockDbSelectList([
            {
              id: "1",
              prenom: "Jean",
              nom: "Martin",
              createdAt: new Date("2024-01-15"),
              rgaSimulationData: null,
            },
          ])
        );

      // Act
      const result = await getAmoAccueilData(entrepriseAmoId);

      // Assert
      expect(result.demandesATraiter[0].commune).toBeNull();
      expect(result.demandesATraiter[0].codePostal).toBeNull();
    });

    it("devrait appeler db.select 3 fois (2 counts + 1 liste)", async () => {
      // Arrange
      vi.mocked(db.select)
        .mockReturnValueOnce(mockDbSelectCount(0))
        .mockReturnValueOnce(mockDbSelectCount(0))
        .mockReturnValueOnce(mockDbSelectList([]));

      // Act
      await getAmoAccueilData(entrepriseAmoId);

      // Assert
      expect(db.select).toHaveBeenCalledTimes(3);
    });

    it("devrait retourner la structure complète des données d'accueil", async () => {
      // Arrange
      vi.mocked(db.select)
        .mockReturnValueOnce(mockDbSelectCount(5))
        .mockReturnValueOnce(mockDbSelectCount(10))
        .mockReturnValueOnce(mockDbSelectList([]));

      // Act
      const result = await getAmoAccueilData(entrepriseAmoId);

      // Assert
      expect(result).toHaveProperty("nombreDemandesEnAttente");
      expect(result).toHaveProperty("nombreDossiersSuivis");
      expect(result).toHaveProperty("demandesATraiter");
      expect(typeof result.nombreDemandesEnAttente).toBe("number");
      expect(typeof result.nombreDossiersSuivis).toBe("number");
      expect(Array.isArray(result.demandesATraiter)).toBe(true);
    });

    it("devrait retourner les demandes avec la bonne structure", async () => {
      // Arrange
      vi.mocked(db.select)
        .mockReturnValueOnce(mockDbSelectCount(1))
        .mockReturnValueOnce(mockDbSelectCount(0))
        .mockReturnValueOnce(
          mockDbSelectList([createMockDemande("abc-123", "Claire", "Moreau", "Issoudun", "36")])
        );

      // Act
      const result = await getAmoAccueilData(entrepriseAmoId);

      // Assert
      const demande = result.demandesATraiter[0];
      expect(demande).toHaveProperty("id");
      expect(demande).toHaveProperty("prenom");
      expect(demande).toHaveProperty("nom");
      expect(demande).toHaveProperty("commune");
      expect(demande).toHaveProperty("codePostal");
      expect(demande).toHaveProperty("dateCreation");
      expect(demande.id).toBe("abc-123");
      expect(demande.prenom).toBe("Claire");
      expect(demande.nom).toBe("Moreau");
      expect(demande.commune).toBe("Issoudun");
      expect(demande.codePostal).toBe("36");
    });

    it("devrait gérer les résultats vides avec le fallback ?? 0", async () => {
      // Arrange - Tableaux vides pour les counts
      const mockEmptyCount = () => {
        const mockWhere = vi.fn().mockResolvedValue([]);
        const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { from: mockFrom } as any;
      };

      vi.mocked(db.select)
        .mockReturnValueOnce(mockEmptyCount())
        .mockReturnValueOnce(mockEmptyCount())
        .mockReturnValueOnce(mockDbSelectList([]));

      // Act
      const result = await getAmoAccueilData(entrepriseAmoId);

      // Assert
      expect(result.nombreDemandesEnAttente).toBe(0);
      expect(result.nombreDossiersSuivis).toBe(0);
    });
  });
});
