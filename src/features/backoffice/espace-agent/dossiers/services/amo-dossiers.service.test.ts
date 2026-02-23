import { describe, it, expect, beforeEach, vi } from "vitest";
import { getAmoDossiersData } from "./amo-dossiers.service";
import { db } from "@/shared/database/client";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";

// Mock du client DB
vi.mock("@/shared/database/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

// Helper pour mocker les chaînes Drizzle - count avec innerJoin
const mockDbSelectCountWithJoin = (countValue: number) => {
  const mockWhere = vi.fn().mockResolvedValue([{ count: countValue }]);
  const mockInnerJoin = vi.fn().mockReturnValue({
    where: mockWhere,
  });
  const mockFrom = vi.fn().mockReturnValue({
    innerJoin: mockInnerJoin,
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

// Helper pour mocker les requêtes DS avec limit
const mockDbSelectDsStatus = (dsStatus: DSStatus | null) => {
  const mockLimit = vi.fn().mockResolvedValue(dsStatus ? [{ dsStatus }] : []);
  const mockWhere = vi.fn().mockReturnValue({
    limit: mockLimit,
  });
  const mockFrom = vi.fn().mockReturnValue({
    where: mockWhere,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from: mockFrom } as any;
};

// Helper pour créer des données mock de dossier
const createMockDossier = (
  id: string,
  prenom: string,
  nom: string,
  currentStep: Step = Step.ELIGIBILITE,
  currentStatus: Status = Status.TODO,
  communeNom?: string,
  codeDepartement?: string,
) => ({
  id,
  prenom,
  nom,
  valideeAt: new Date("2024-01-15"),
  parcoursId: `parcours-${id}`,
  currentStep,
  currentStatus,
  rgaSimulationData: {
    logement: {
      ...(communeNom && { commune_nom: communeNom }),
      ...(codeDepartement && { code_departement: codeDepartement }),
    },
  },
});

describe("AmoDossiersService", () => {
  const entrepriseAmoId = "entreprise-amo-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAmoDossiersData", () => {
    it("devrait retourner les données des dossiers complètes", async () => {
      // Arrange - Mock des 4 requêtes DB parallèles + DS status pour chaque dossier
      vi.mocked(db.select)
        .mockReturnValueOnce(mockDbSelectCountWithJoin(12)) // nombre dossiers suivis
        .mockReturnValueOnce(mockDbSelectCountWithJoin(3)) // nombre dossiers archivés
        .mockReturnValueOnce(
          mockDbSelectList([
            createMockDossier("1", "Sophie", "Dubois", Step.DIAGNOSTIC, Status.TODO, "Le Poinçonnet", "36"),
            createMockDossier("2", "Marc", "Lefèvre", Step.DEVIS, Status.EN_INSTRUCTION, "Déols", "36"),
          ]),
        ) // liste des dossiers suivis
        .mockReturnValueOnce(
          mockDbSelectList([
            createMockDossier("3", "Bilbo", "Sacquet", Step.DIAGNOSTIC, Status.TODO, "Châteauroux", "36"),
          ]),
        ) // liste des dossiers archivés
        .mockReturnValueOnce(mockDbSelectDsStatus(null)) // DS status dossier 1
        .mockReturnValueOnce(mockDbSelectDsStatus(DSStatus.EN_INSTRUCTION)) // DS status dossier 2
        .mockReturnValueOnce(mockDbSelectDsStatus(null)); // DS status dossier 3

      // Act
      const result = await getAmoDossiersData(entrepriseAmoId);

      // Assert
      expect(result.nombreDossiersSuivis).toBe(12);
      expect(result.nombreDossiersArchives).toBe(3);
      expect(result.dossiersSuivis).toHaveLength(2);
      expect(result.dossiersArchives).toHaveLength(1);
      expect(result.dossiersSuivis[0]).toEqual({
        id: "1",
        parcoursId: "parcours-1",
        prenom: "Sophie",
        nom: "Dubois",
        commune: "Le Poinçonnet",
        codeDepartement: "36",
        etape: Step.DIAGNOSTIC,
        statut: Status.TODO,
        dsStatus: null,
        dateValidation: new Date("2024-01-15"),
        dateDernierStatut: undefined,
      });
      expect(result.dossiersSuivis[1].dsStatus).toBe(DSStatus.EN_INSTRUCTION);
      expect(result.dossiersArchives[0].prenom).toBe("Bilbo");
    });

    it("devrait retourner 0 et tableaux vides si aucun dossier", async () => {
      // Arrange
      vi.mocked(db.select)
        .mockReturnValueOnce(mockDbSelectCountWithJoin(0)) // nombre suivis
        .mockReturnValueOnce(mockDbSelectCountWithJoin(0)) // nombre archivés
        .mockReturnValueOnce(mockDbSelectList([])) // liste suivis vide
        .mockReturnValueOnce(mockDbSelectList([])); // liste archivés vide

      // Act
      const result = await getAmoDossiersData(entrepriseAmoId);

      // Assert
      expect(result.nombreDossiersSuivis).toBe(0);
      expect(result.nombreDossiersArchives).toBe(0);
      expect(result.dossiersSuivis).toEqual([]);
      expect(result.dossiersArchives).toEqual([]);
    });

    it("devrait gérer les dossiers sans données de commune", async () => {
      // Arrange
      vi.mocked(db.select)
        .mockReturnValueOnce(mockDbSelectCountWithJoin(1))
        .mockReturnValueOnce(mockDbSelectCountWithJoin(0))
        .mockReturnValueOnce(
          mockDbSelectList([
            {
              id: "1",
              prenom: "Jean",
              nom: "Martin",
              valideeAt: new Date("2024-01-15"),
              parcoursId: "parcours-1",
              currentStep: Step.ELIGIBILITE,
              currentStatus: Status.TODO,
              rgaSimulationData: null,
            },
          ]),
        )
        .mockReturnValueOnce(mockDbSelectList([]))
        .mockReturnValueOnce(mockDbSelectDsStatus(null));

      // Act
      const result = await getAmoDossiersData(entrepriseAmoId);

      // Assert
      expect(result.dossiersSuivis[0].commune).toBeNull();
      expect(result.dossiersSuivis[0].codeDepartement).toBeNull();
    });

    it("devrait retourner la structure complète des données", async () => {
      // Arrange
      vi.mocked(db.select)
        .mockReturnValueOnce(mockDbSelectCountWithJoin(5))
        .mockReturnValueOnce(mockDbSelectCountWithJoin(2))
        .mockReturnValueOnce(mockDbSelectList([]))
        .mockReturnValueOnce(mockDbSelectList([]));

      // Act
      const result = await getAmoDossiersData(entrepriseAmoId);

      // Assert
      expect(result).toHaveProperty("nombreDossiersSuivis");
      expect(result).toHaveProperty("nombreDossiersArchives");
      expect(result).toHaveProperty("dossiersSuivis");
      expect(result).toHaveProperty("dossiersArchives");
      expect(typeof result.nombreDossiersSuivis).toBe("number");
      expect(typeof result.nombreDossiersArchives).toBe("number");
      expect(Array.isArray(result.dossiersSuivis)).toBe(true);
      expect(Array.isArray(result.dossiersArchives)).toBe(true);
    });

    it("devrait retourner les dossiers avec la bonne structure", async () => {
      // Arrange
      vi.mocked(db.select)
        .mockReturnValueOnce(mockDbSelectCountWithJoin(1))
        .mockReturnValueOnce(mockDbSelectCountWithJoin(0))
        .mockReturnValueOnce(
          mockDbSelectList([
            createMockDossier("abc-123", "Claire", "Moreau", Step.FACTURES, Status.VALIDE, "Issoudun", "36"),
          ]),
        )
        .mockReturnValueOnce(mockDbSelectList([]))
        .mockReturnValueOnce(mockDbSelectDsStatus(DSStatus.ACCEPTE));

      // Act
      const result = await getAmoDossiersData(entrepriseAmoId);

      // Assert
      const dossier = result.dossiersSuivis[0];
      expect(dossier).toHaveProperty("id");
      expect(dossier).toHaveProperty("prenom");
      expect(dossier).toHaveProperty("nom");
      expect(dossier).toHaveProperty("commune");
      expect(dossier).toHaveProperty("codeDepartement");
      expect(dossier).toHaveProperty("etape");
      expect(dossier).toHaveProperty("statut");
      expect(dossier).toHaveProperty("dsStatus");
      expect(dossier).toHaveProperty("dateValidation");
      expect(dossier.id).toBe("abc-123");
      expect(dossier.prenom).toBe("Claire");
      expect(dossier.nom).toBe("Moreau");
      expect(dossier.etape).toBe(Step.FACTURES);
      expect(dossier.statut).toBe(Status.VALIDE);
      expect(dossier.dsStatus).toBe(DSStatus.ACCEPTE);
    });

    it("devrait gérer les résultats vides avec le fallback ?? 0", async () => {
      // Arrange - Tableaux vides pour les counts
      const mockEmptyCount = () => {
        const mockWhere = vi.fn().mockResolvedValue([]);
        const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere });
        const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { from: mockFrom } as any;
      };

      vi.mocked(db.select)
        .mockReturnValueOnce(mockEmptyCount())
        .mockReturnValueOnce(mockEmptyCount())
        .mockReturnValueOnce(mockDbSelectList([]))
        .mockReturnValueOnce(mockDbSelectList([]));

      // Act
      const result = await getAmoDossiersData(entrepriseAmoId);

      // Assert
      expect(result.nombreDossiersSuivis).toBe(0);
      expect(result.nombreDossiersArchives).toBe(0);
    });
  });
});
