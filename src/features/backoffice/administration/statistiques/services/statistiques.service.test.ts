import { describe, it, expect, beforeEach, vi } from "vitest";
import { getStatistiques } from "./statistiques.service";
import { db } from "@/shared/database/client";
import * as matomoService from "./matomo.service";
import * as matomoFunnelService from "./matomo-funnel.service";

// Mock du client DB
vi.mock("@/shared/database/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

// Mock du service Matomo
vi.mock("./matomo.service", () => ({
  getMatomoStatistiques: vi.fn(),
}));

// Mock du service Matomo Funnel
vi.mock("./matomo-funnel.service", () => ({
  getFunnelSimulateurRGA: vi.fn(),
}));

// Helper pour mocker les chaînes Drizzle simples (select -> from)
const mockDbSelect = (data: unknown) => {
  const mockFrom = vi.fn().mockResolvedValue(data);

  return {
    from: mockFrom,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
};

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

describe("StatistiquesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock par défaut pour Matomo
    vi.mocked(matomoService.getMatomoStatistiques).mockResolvedValue({
      nombreVisitesTotales: 1500,
      visitesParJour: [
        { date: "2025-01-01", visites: 50 },
        { date: "2025-01-02", visites: 60 },
      ],
    });

    // Mock par défaut pour le Funnel
    vi.mocked(matomoFunnelService.getFunnelSimulateurRGA).mockResolvedValue({
      etapes: [
        {
          nom: "Étape 1",
          position: 1,
          visiteurs: 100,
          conversions: 80,
          tauxConversion: 80,
          abandons: 20,
          tauxAbandon: 20,
        },
        {
          nom: "Étape 2",
          position: 2,
          visiteurs: 80,
          conversions: 60,
          tauxConversion: 75,
          abandons: 20,
          tauxAbandon: 25,
        },
      ],
      visiteursInitiaux: 100,
      conversionsFinales: 60,
      tauxConversionGlobal: 60,
    });
  });

  describe("getStatistiques", () => {
    it("devrait retourner toutes les statistiques DB + Matomo + Funnel avec des valeurs correctes", async () => {
      // Arrange - Mock des 6 requêtes DB dans l'ordre
      vi.mocked(db.select)
        // 1. getNombreComptesCreés (sans where)
        .mockReturnValueOnce(mockDbSelect([{ count: 150 }]))
        // 2. getNombreDemandesAMO (sans where)
        .mockReturnValueOnce(mockDbSelect([{ count: 80 }]))
        // 3. getNombreDemandesAMOEnAttente (avec where)
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 25 }]))
        // 4. getNombreTotalDossiersDS (sans where)
        .mockReturnValueOnce(mockDbSelect([{ count: 60 }]))
        // 5. getNombreDossiersDSBrouillon (avec where - isNull)
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 20 }]))
        // 6. getNombreDossiersDSEnvoyés (avec where - isNotNull)
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 40 }]));

      // Act
      const stats = await getStatistiques();

      // Assert
      expect(stats).toEqual({
        // Stats DB
        nombreComptesCreés: 150,
        nombreDemandesAMO: 80,
        nombreDemandesAMOEnAttente: 25,
        nombreTotalDossiersDS: 60,
        nombreDossiersDSBrouillon: 20,
        nombreDossiersDSEnvoyés: 40,
        // Stats Matomo
        nombreVisitesTotales: 1500,
        visitesParJour: [
          { date: "2025-01-01", visites: 50 },
          { date: "2025-01-02", visites: 60 },
        ],
        // Stats Funnel
        funnelSimulateurRGA: {
          etapes: [
            {
              nom: "Étape 1",
              position: 1,
              visiteurs: 100,
              conversions: 80,
              tauxConversion: 80,
              abandons: 20,
              tauxAbandon: 20,
            },
            {
              nom: "Étape 2",
              position: 2,
              visiteurs: 80,
              conversions: 60,
              tauxConversion: 75,
              abandons: 20,
              tauxAbandon: 25,
            },
          ],
          visiteursInitiaux: 100,
          conversionsFinales: 60,
          tauxConversionGlobal: 60,
        },
      });
    });

    it("devrait retourner 0 pour chaque statistique si les tables sont vides", async () => {
      // Arrange
      vi.mocked(db.select)
        .mockReturnValueOnce(mockDbSelect([{ count: 0 }]))
        .mockReturnValueOnce(mockDbSelect([{ count: 0 }]))
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 0 }]))
        .mockReturnValueOnce(mockDbSelect([{ count: 0 }]))
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 0 }]))
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 0 }]));

      // Mock Matomo avec 0 visites
      vi.mocked(matomoService.getMatomoStatistiques).mockResolvedValue({
        nombreVisitesTotales: 0,
        visitesParJour: [],
      });

      // Mock Funnel vide
      vi.mocked(matomoFunnelService.getFunnelSimulateurRGA).mockResolvedValue({
        etapes: [],
        visiteursInitiaux: 0,
        conversionsFinales: 0,
        tauxConversionGlobal: 0,
      });

      // Act
      const stats = await getStatistiques();

      // Assert
      expect(stats).toEqual({
        nombreComptesCreés: 0,
        nombreDemandesAMO: 0,
        nombreDemandesAMOEnAttente: 0,
        nombreTotalDossiersDS: 0,
        nombreDossiersDSBrouillon: 0,
        nombreDossiersDSEnvoyés: 0,
        nombreVisitesTotales: 0,
        visitesParJour: [],
        funnelSimulateurRGA: {
          etapes: [],
          visiteursInitiaux: 0,
          conversionsFinales: 0,
          tauxConversionGlobal: 0,
        },
      });
    });

    it("devrait gérer les résultats vides de la DB avec le fallback ?? 0", async () => {
      // Arrange - Tableaux vides
      vi.mocked(db.select)
        .mockReturnValueOnce(mockDbSelect([]))
        .mockReturnValueOnce(mockDbSelect([]))
        .mockReturnValueOnce(mockDbSelectWithWhere([]))
        .mockReturnValueOnce(mockDbSelect([]))
        .mockReturnValueOnce(mockDbSelectWithWhere([]))
        .mockReturnValueOnce(mockDbSelectWithWhere([]));

      // Act
      const stats = await getStatistiques();

      // Assert - Devrait fallback à 0 grâce au ?? 0
      expect(stats).toEqual({
        nombreComptesCreés: 0,
        nombreDemandesAMO: 0,
        nombreDemandesAMOEnAttente: 0,
        nombreTotalDossiersDS: 0,
        nombreDossiersDSBrouillon: 0,
        nombreDossiersDSEnvoyés: 0,
        // Stats Matomo du mock par défaut
        nombreVisitesTotales: 1500,
        visitesParJour: [
          { date: "2025-01-01", visites: 50 },
          { date: "2025-01-02", visites: 60 },
        ],
        // Stats Funnel du mock par défaut
        funnelSimulateurRGA: {
          etapes: [
            {
              nom: "Étape 1",
              position: 1,
              visiteurs: 100,
              conversions: 80,
              tauxConversion: 80,
              abandons: 20,
              tauxAbandon: 20,
            },
            {
              nom: "Étape 2",
              position: 2,
              visiteurs: 80,
              conversions: 60,
              tauxConversion: 75,
              abandons: 20,
              tauxAbandon: 25,
            },
          ],
          visiteursInitiaux: 100,
          conversionsFinales: 60,
          tauxConversionGlobal: 60,
        },
      });
    });

    it("devrait appeler db.select 6 fois, getMatomoStatistiques 1 fois et getFunnelSimulateurRGA 1 fois", async () => {
      // Arrange
      vi.mocked(db.select)
        .mockReturnValueOnce(mockDbSelect([{ count: 10 }]))
        .mockReturnValueOnce(mockDbSelect([{ count: 10 }]))
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 10 }]))
        .mockReturnValueOnce(mockDbSelect([{ count: 10 }]))
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 10 }]))
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 10 }]));

      // Act
      await getStatistiques();

      // Assert
      expect(db.select).toHaveBeenCalledTimes(6);
      expect(matomoService.getMatomoStatistiques).toHaveBeenCalledTimes(1);
      expect(matomoFunnelService.getFunnelSimulateurRGA).toHaveBeenCalledTimes(
        1
      );
    });

    it("devrait gérer une erreur Matomo et continuer avec les stats DB", async () => {
      // Arrange
      vi.mocked(db.select)
        .mockReturnValueOnce(mockDbSelect([{ count: 150 }]))
        .mockReturnValueOnce(mockDbSelect([{ count: 80 }]))
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 25 }]))
        .mockReturnValueOnce(mockDbSelect([{ count: 60 }]))
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 20 }]))
        .mockReturnValueOnce(mockDbSelectWithWhere([{ count: 40 }]));

      // Mock Matomo qui retourne des valeurs par défaut (gestion d'erreur dans le service)
      vi.mocked(matomoService.getMatomoStatistiques).mockResolvedValue({
        nombreVisitesTotales: 0,
        visitesParJour: [],
      });

      // Act
      const stats = await getStatistiques();

      // Assert - Les stats DB doivent être présentes même si Matomo échoue
      expect(stats.nombreComptesCreés).toBe(150);
      expect(stats.nombreVisitesTotales).toBe(0);
      expect(stats.funnelSimulateurRGA).toBeDefined();
    });
  });
});
