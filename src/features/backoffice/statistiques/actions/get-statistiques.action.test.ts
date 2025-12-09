import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { AccessErrorCode } from "@/features/auth/permissions/domain";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";

// Mock des dépendances AVANT les imports
vi.mock("@/features/auth/permissions/services/permissions.service", () => ({
  checkBackofficePermission: vi.fn(),
}));

vi.mock("../services/statistiques.service", () => ({
  getStatistiques: vi.fn(),
}));

// Mock de l'environnement serveur
vi.mock("@/shared/config/env.config", () => ({
  getServerEnv: vi.fn(() => ({
    DATABASE_URL: "postgresql://test",
    DEMARCHES_SIMPLIFIEES_API_URL: "https://test.api.com",
    DEMARCHES_SIMPLIFIEES_API_TOKEN: "test-token",
    DEMARCHES_SIMPLIFIEES_REST_API_URL: "https://test.rest.api.com",
    NEXTAUTH_SECRET: "test-secret",
  })),
  isClient: vi.fn(() => false),
  isServer: vi.fn(() => true),
  isProduction: vi.fn(() => false),
}));

// Import des actions à tester APRÈS le mock des dépendances
import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { getStatistiques } from "../services/statistiques.service";
import { getStatistiquesAction } from "./get-statistiques.action";

describe("statistiques.actions", () => {
  // Helper pour créer un utilisateur de test
  const createMockUser = (role: UserRole) => ({
    sub: "test-sub-123",
    id: "user-123",
    email: "test@example.com",
    givenName: "Test",
    familyName: "User",
    role,
    authMethod: "proconnect",
    loginTime: new Date(),
  });

  // Helper pour créer des statistiques de test
  const createMockStatistiques = () => ({
    totalUsers: 150,
    totalEligibilites: 120,
    totalDiagnostics: 80,
    totalDevis: 50,
    totalFactures: 30,
    budgetTotal: 30000000,
    budgetConsomme: 300000,
    budgetRestant: 29700000,
    tauxConversion: {
      eligibiliteToDiagnostic: 66.67,
      diagnosticToDevis: 62.5,
      devisToFacture: 60.0,
    },
    parcoursParDepartement: [
      {
        departement: "75",
        totalUsers: 50,
        totalEligibilites: 40,
        totalDiagnostics: 25,
        totalDevis: 15,
        totalFactures: 10,
      },
      {
        departement: "92",
        totalUsers: 30,
        totalEligibilites: 25,
        totalDiagnostics: 15,
        totalDevis: 10,
        totalFactures: 5,
      },
    ],
    evolutionMensuelle: [
      {
        mois: "2024-01",
        nouveauxUsers: 20,
        nouvellesEligibilites: 15,
        nouveauxDiagnostics: 10,
        nouveauxDevis: 5,
        nouvellesFactures: 3,
      },
      {
        mois: "2024-02",
        nouveauxUsers: 25,
        nouvellesEligibilites: 20,
        nouveauxDiagnostics: 12,
        nouveauxDevis: 8,
        nouvellesFactures: 4,
      },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getStatistiquesAction", () => {
    it("devrait autoriser l'accès pour SUPER_ADMINISTRATEUR", async () => {
      const mockUser = createMockUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockStats = createMockStatistiques();
      vi.mocked(getStatistiques).mockResolvedValue(mockStats);

      const result = await getStatistiquesAction();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockStats);
        expect(result.data.totalUsers).toBe(150);
        expect(result.data.budgetTotal).toBe(30000000);
      }
      expect(checkBackofficePermission).toHaveBeenCalledWith(BackofficePermission.STATS_READ);
      expect(getStatistiques).toHaveBeenCalled();
    });

    it("devrait autoriser l'accès pour ADMINISTRATEUR", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockStats = createMockStatistiques();
      vi.mocked(getStatistiques).mockResolvedValue(mockStats);

      const result = await getStatistiquesAction();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockStats);
      }
      expect(checkBackofficePermission).toHaveBeenCalled();
    });

    it("devrait autoriser l'accès pour ANALYSTE", async () => {
      const mockUser = createMockUser(UserRole.ANALYSTE);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockStats = createMockStatistiques();
      vi.mocked(getStatistiques).mockResolvedValue(mockStats);

      const result = await getStatistiquesAction();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockStats);
      }
      expect(checkBackofficePermission).toHaveBeenCalledWith(BackofficePermission.STATS_READ);
    });

    it("devrait refuser l'accès pour AMO", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour consulter les statistiques",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const result = await getStatistiquesAction();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Permission insuffisante pour consulter les statistiques");
      }
      expect(getStatistiques).not.toHaveBeenCalled();
    });

    it("devrait refuser l'accès pour PARTICULIER", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour consulter les statistiques",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const result = await getStatistiquesAction();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Permission insuffisante pour consulter les statistiques");
      }
      expect(getStatistiques).not.toHaveBeenCalled();
    });

    it("devrait gérer les erreurs de récupération", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(getStatistiques).mockRejectedValue(new Error("Erreur de base de données"));

      const result = await getStatistiquesAction();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Une erreur est survenue lors de la récupération des statistiques.");
      }
    });

    it("devrait gérer les erreurs inconnues", async () => {
      const mockUser = createMockUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(getStatistiques).mockRejectedValue("Erreur non-Error");

      const result = await getStatistiquesAction();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Une erreur est survenue lors de la récupération des statistiques.");
      }
    });

    it("devrait retourner des statistiques avec tous les champs requis", async () => {
      const mockUser = createMockUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockStats = createMockStatistiques();
      vi.mocked(getStatistiques).mockResolvedValue(mockStats);

      const result = await getStatistiquesAction();

      expect(result.success).toBe(true);
      if (result.success) {
        // Vérifier la structure complète
        expect(result.data).toHaveProperty("totalUsers");
        expect(result.data).toHaveProperty("totalEligibilites");
        expect(result.data).toHaveProperty("totalDiagnostics");
        expect(result.data).toHaveProperty("totalDevis");
        expect(result.data).toHaveProperty("totalFactures");
        expect(result.data).toHaveProperty("budgetTotal");
        expect(result.data).toHaveProperty("budgetConsomme");
        expect(result.data).toHaveProperty("budgetRestant");
        expect(result.data).toHaveProperty("tauxConversion");
        expect(result.data).toHaveProperty("parcoursParDepartement");
        expect(result.data).toHaveProperty("evolutionMensuelle");
      }
    });

    it("devrait retourner des taux de conversion corrects", async () => {
      const mockUser = createMockUser(UserRole.ANALYSTE);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockStats = createMockStatistiques();
      vi.mocked(getStatistiques).mockResolvedValue(mockStats);

      const result = await getStatistiquesAction();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tauxConversion).toHaveProperty("eligibiliteToDiagnostic");
        expect(result.data.tauxConversion).toHaveProperty("diagnosticToDevis");
        expect(result.data.tauxConversion).toHaveProperty("devisToFacture");
        expect(result.data.tauxConversion.eligibiliteToDiagnostic).toBeGreaterThanOrEqual(0);
        expect(result.data.tauxConversion.eligibiliteToDiagnostic).toBeLessThanOrEqual(100);
      }
    });

    it("devrait retourner des données par département", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockStats = createMockStatistiques();
      vi.mocked(getStatistiques).mockResolvedValue(mockStats);

      const result = await getStatistiquesAction();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data.parcoursParDepartement)).toBe(true);
        expect(result.data.parcoursParDepartement.length).toBeGreaterThan(0);
        expect(result.data.parcoursParDepartement[0]).toHaveProperty("departement");
        expect(result.data.parcoursParDepartement[0]).toHaveProperty("totalUsers");
      }
    });

    it("devrait retourner l'évolution mensuelle", async () => {
      const mockUser = createMockUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockStats = createMockStatistiques();
      vi.mocked(getStatistiques).mockResolvedValue(mockStats);

      const result = await getStatistiquesAction();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data.evolutionMensuelle)).toBe(true);
        expect(result.data.evolutionMensuelle.length).toBeGreaterThan(0);
        expect(result.data.evolutionMensuelle[0]).toHaveProperty("mois");
        expect(result.data.evolutionMensuelle[0]).toHaveProperty("nouveauxUsers");
      }
    });

    it("devrait calculer correctement le budget restant", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockStats = createMockStatistiques();
      vi.mocked(getStatistiques).mockResolvedValue(mockStats);

      const result = await getStatistiquesAction();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.budgetRestant).toBe(result.data.budgetTotal - result.data.budgetConsomme);
      }
    });

    it("devrait gérer les statistiques avec des valeurs à zéro", async () => {
      const mockUser = createMockUser(UserRole.ANALYSTE);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const emptyStats = {
        totalUsers: 0,
        totalEligibilites: 0,
        totalDiagnostics: 0,
        totalDevis: 0,
        totalFactures: 0,
        budgetTotal: 30000000,
        budgetConsomme: 0,
        budgetRestant: 30000000,
        tauxConversion: {
          eligibiliteToDiagnostic: 0,
          diagnosticToDevis: 0,
          devisToFacture: 0,
        },
        parcoursParDepartement: [],
        evolutionMensuelle: [],
      };

      vi.mocked(getStatistiques).mockResolvedValue(emptyStats);

      const result = await getStatistiquesAction();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalUsers).toBe(0);
        expect(result.data.budgetConsomme).toBe(0);
        expect(result.data.parcoursParDepartement).toEqual([]);
      }
    });
  });

  describe("Sécurité et cas limites", () => {
    it("devrait empêcher l'accès sans authentification", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Utilisateur non authentifié",
        errorCode: AccessErrorCode.NOT_AUTHENTICATED,
      });

      const result = await getStatistiquesAction();

      expect(result.success).toBe(false);
      expect(getStatistiques).not.toHaveBeenCalled();
    });

    it("devrait vérifier la permission STATS_READ spécifiquement", async () => {
      const mockUser = createMockUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockStats = createMockStatistiques();
      vi.mocked(getStatistiques).mockResolvedValue(mockStats);

      await getStatistiquesAction();

      // Vérifie que c'est bien STATS_READ qui est demandé
      expect(checkBackofficePermission).toHaveBeenCalledWith(BackofficePermission.STATS_READ);
      expect(checkBackofficePermission).not.toHaveBeenCalledWith(BackofficePermission.USERS_STATS_READ);
    });

    it("devrait gérer les timeouts de base de données", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(getStatistiques).mockRejectedValue(new Error("Connection timeout"));

      const result = await getStatistiquesAction();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Une erreur est survenue lors de la récupération des statistiques.");
      }
    });

    it("devrait retourner un message d'erreur générique pour les erreurs", async () => {
      const mockUser = createMockUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(getStatistiques).mockRejectedValue(new Error("Détail technique sensible"));

      const result = await getStatistiquesAction();

      expect(result.success).toBe(false);
      if (!result.success) {
        // Le message d'erreur est générique pour ne pas exposer les détails techniques
        expect(result.error).toBe("Une erreur est survenue lors de la récupération des statistiques.");
        expect(result.error).not.toContain("Détail technique sensible");
      }
    });
  });
});
