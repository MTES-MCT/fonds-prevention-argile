import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Agent } from "@/shared/database/schema/agents";
import type { AmoStatistiques } from "../domain/types";

// Mock des dépendances AVANT les imports
vi.mock("@/features/backoffice/shared/actions/agent.actions", () => ({
  getCurrentAgent: vi.fn(),
}));

vi.mock("../services/amo-statistiques.service", () => ({
  getAmoStatistiques: vi.fn(),
}));

// Import des fonctions mockées et de l'action à tester APRÈS les mocks
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { getAmoStatistiques } from "../services/amo-statistiques.service";
import { getAmoStatistiquesAction } from "./get-amo-statistiques.action";

// Helper pour créer un mock d'agent
const createMockAgent = (override?: Partial<Agent>): Agent => ({
  id: "agent-123",
  sub: "sub-123",
  email: "agent@example.com",
  givenName: "Jean",
  usualName: "Dupont",
  uid: null,
  siret: null,
  phone: null,
  organizationalUnit: null,
  role: "amo",
  entrepriseAmoId: "entreprise-amo-456",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...override,
});

// Helper pour créer des mock statistiques AMO
const createMockAmoStatistiques = (override?: Partial<AmoStatistiques>): AmoStatistiques => ({
  indicateursCles: {
    nombreDossiersEnCoursAccompagnement: 12,
    nombreDemandesAccompagnement: {
      total: 16,
      acceptees: 12,
      refusees: 4,
    },
  },
  ...override,
});

describe("getAmoStatistiquesAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devrait retourner les statistiques pour un agent AMO avec entreprise", async () => {
    // Arrange
    const mockAgent = createMockAgent();
    vi.mocked(getCurrentAgent).mockResolvedValue({
      success: true,
      data: mockAgent,
    });

    const mockStats = createMockAmoStatistiques();
    vi.mocked(getAmoStatistiques).mockResolvedValue(mockStats);

    // Act
    const result = await getAmoStatistiquesAction();

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mockStats);
      expect(result.data.indicateursCles.nombreDossiersEnCoursAccompagnement).toBe(12);
    }
    expect(getCurrentAgent).toHaveBeenCalled();
    expect(getAmoStatistiques).toHaveBeenCalledWith("entreprise-amo-456");
  });

  it("devrait retourner une erreur si l'agent n'est pas connecté", async () => {
    // Arrange
    vi.mocked(getCurrentAgent).mockResolvedValue({
      success: false,
      error: "Utilisateur non connecté",
    });

    // Act
    const result = await getAmoStatistiquesAction();

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Utilisateur non connecté");
    }
    expect(getAmoStatistiques).not.toHaveBeenCalled();
  });

  it("devrait retourner une erreur si l'agent n'a pas d'entreprise AMO associée", async () => {
    // Arrange
    const mockAgent = createMockAgent({ entrepriseAmoId: null });
    vi.mocked(getCurrentAgent).mockResolvedValue({
      success: true,
      data: mockAgent,
    });

    // Act
    const result = await getAmoStatistiquesAction();

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Aucune entreprise AMO associée à votre compte");
    }
    expect(getAmoStatistiques).not.toHaveBeenCalled();
  });

  it("devrait gérer les erreurs du service statistiques", async () => {
    // Arrange
    const mockAgent = createMockAgent();
    vi.mocked(getCurrentAgent).mockResolvedValue({
      success: true,
      data: mockAgent,
    });

    vi.mocked(getAmoStatistiques).mockRejectedValue(new Error("Erreur de base de données"));

    // Act
    const result = await getAmoStatistiquesAction();

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Erreur lors de la récupération des statistiques");
    }
  });

  it("devrait retourner des statistiques avec des valeurs à zéro", async () => {
    // Arrange
    const mockAgent = createMockAgent();
    vi.mocked(getCurrentAgent).mockResolvedValue({
      success: true,
      data: mockAgent,
    });

    const emptyStats: AmoStatistiques = {
      indicateursCles: {
        nombreDossiersEnCoursAccompagnement: 0,
        nombreDemandesAccompagnement: {
          total: 0,
          acceptees: 0,
          refusees: 0,
        },
      },
    };
    vi.mocked(getAmoStatistiques).mockResolvedValue(emptyStats);

    // Act
    const result = await getAmoStatistiquesAction();

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.indicateursCles.nombreDossiersEnCoursAccompagnement).toBe(0);
      expect(result.data.indicateursCles.nombreDemandesAccompagnement.total).toBe(0);
    }
  });

  it("devrait retourner une erreur si l'authentification ProConnect échoue", async () => {
    // Arrange
    vi.mocked(getCurrentAgent).mockResolvedValue({
      success: false,
      error: "Authentification ProConnect requise",
    });

    // Act
    const result = await getAmoStatistiquesAction();

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Authentification ProConnect requise");
    }
    expect(getAmoStatistiques).not.toHaveBeenCalled();
  });
});
