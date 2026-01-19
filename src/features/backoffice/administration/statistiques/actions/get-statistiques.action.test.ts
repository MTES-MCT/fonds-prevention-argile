import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { AccessErrorCode } from "@/features/auth/permissions/domain";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import {
  createMockAuthUser,
  createMockStatistiques,
  createEmptyStatistiques,
  createEnvConfigMock,
} from "@/shared/testing/mocks";

// Mock des dépendances AVANT les imports
vi.mock("@/features/auth/permissions/services/permissions.service", () => ({
  checkBackofficePermission: vi.fn(),
}));

vi.mock("@/features/auth/permissions/services/agent-scope.service", () => ({
  getScopeFilters: vi.fn(),
}));

vi.mock("../services/statistiques.service", () => ({
  getStatistiques: vi.fn(),
}));

// Mock de l'environnement serveur
vi.mock("@/shared/config/env.config", () => createEnvConfigMock());

// Import des actions à tester APRÈS le mock des dépendances
import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { getScopeFilters } from "@/features/auth/permissions/services/agent-scope.service";
import { getStatistiques } from "../services/statistiques.service";
import { getStatistiquesAction } from "./get-statistiques.action";

describe("statistiques.actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Par défaut, pas de filtre de scope (accès national)
    vi.mocked(getScopeFilters).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getStatistiquesAction", () => {
    it("devrait autoriser l'accès pour SUPER_ADMINISTRATEUR", async () => {
      const mockUser = createMockAuthUser(UserRole.SUPER_ADMINISTRATEUR);
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
        expect(result.data.nombreComptesCreés).toBe(150);
      }
      expect(checkBackofficePermission).toHaveBeenCalledWith(BackofficePermission.STATS_READ);
      expect(getScopeFilters).toHaveBeenCalled();
      expect(getStatistiques).toHaveBeenCalledWith(null);
    });

    it("devrait autoriser l'accès pour ADMINISTRATEUR", async () => {
      const mockUser = createMockAuthUser(UserRole.ADMINISTRATEUR);
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
      expect(getScopeFilters).toHaveBeenCalled();
    });

    it("devrait autoriser l'accès pour ANALYSTE", async () => {
      const mockUser = createMockAuthUser(UserRole.ANALYSTE);
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
      expect(getScopeFilters).toHaveBeenCalled();
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
      expect(getScopeFilters).not.toHaveBeenCalled();
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
      expect(getScopeFilters).not.toHaveBeenCalled();
      expect(getStatistiques).not.toHaveBeenCalled();
    });

    it("devrait passer les filtres de scope au service", async () => {
      const mockUser = createMockAuthUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const scopeFilters = { entrepriseAmoIds: ["entreprise-123"] };
      vi.mocked(getScopeFilters).mockResolvedValue(scopeFilters);

      const mockStats = createMockStatistiques();
      vi.mocked(getStatistiques).mockResolvedValue(mockStats);

      await getStatistiquesAction();

      expect(getStatistiques).toHaveBeenCalledWith(scopeFilters);
    });

    it("devrait gérer les erreurs de récupération", async () => {
      const mockUser = createMockAuthUser(UserRole.ADMINISTRATEUR);
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
      const mockUser = createMockAuthUser(UserRole.SUPER_ADMINISTRATEUR);
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
      const mockUser = createMockAuthUser(UserRole.SUPER_ADMINISTRATEUR);
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
        expect(result.data).toHaveProperty("nombreComptesCreés");
        expect(result.data).toHaveProperty("nombreDemandesAMO");
        expect(result.data).toHaveProperty("nombreDemandesAMOEnAttente");
        expect(result.data).toHaveProperty("nombreTotalDossiersDS");
        expect(result.data).toHaveProperty("nombreDossiersDSBrouillon");
        expect(result.data).toHaveProperty("nombreDossiersDSEnvoyés");
        expect(result.data).toHaveProperty("nombreVisitesTotales");
        expect(result.data).toHaveProperty("visitesParJour");
        expect(result.data).toHaveProperty("funnelSimulateurRGA");
      }
    });

    it("devrait retourner un funnel avec les bonnes propriétés", async () => {
      const mockUser = createMockAuthUser(UserRole.ANALYSTE);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockStats = createMockStatistiques();
      vi.mocked(getStatistiques).mockResolvedValue(mockStats);

      const result = await getStatistiquesAction();

      expect(result.success).toBe(true);
      if (result.success && result.data.funnelSimulateurRGA) {
        expect(result.data.funnelSimulateurRGA).toHaveProperty("etapes");
        expect(result.data.funnelSimulateurRGA).toHaveProperty("visiteursInitiaux");
        expect(result.data.funnelSimulateurRGA).toHaveProperty("conversionsFinales");
        expect(result.data.funnelSimulateurRGA).toHaveProperty("tauxConversionGlobal");
        expect(Array.isArray(result.data.funnelSimulateurRGA.etapes)).toBe(true);
      }
    });

    it("devrait retourner des visites par jour", async () => {
      const mockUser = createMockAuthUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockStats = createMockStatistiques();
      vi.mocked(getStatistiques).mockResolvedValue(mockStats);

      const result = await getStatistiquesAction();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data.visitesParJour)).toBe(true);
        expect(result.data.visitesParJour.length).toBeGreaterThan(0);
        expect(result.data.visitesParJour[0]).toHaveProperty("date");
        expect(result.data.visitesParJour[0]).toHaveProperty("visites");
      }
    });

    it("devrait gérer les statistiques avec des valeurs à zéro", async () => {
      const mockUser = createMockAuthUser(UserRole.ANALYSTE);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const emptyStats = createEmptyStatistiques();
      vi.mocked(getStatistiques).mockResolvedValue(emptyStats);

      const result = await getStatistiquesAction();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nombreComptesCreés).toBe(0);
        expect(result.data.nombreDemandesAMO).toBe(0);
        expect(result.data.visitesParJour).toEqual([]);
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
      expect(getScopeFilters).not.toHaveBeenCalled();
      expect(getStatistiques).not.toHaveBeenCalled();
    });

    it("devrait vérifier la permission STATS_READ spécifiquement", async () => {
      const mockUser = createMockAuthUser(UserRole.SUPER_ADMINISTRATEUR);
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
      const mockUser = createMockAuthUser(UserRole.ADMINISTRATEUR);
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
      const mockUser = createMockAuthUser(UserRole.SUPER_ADMINISTRATEUR);
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
