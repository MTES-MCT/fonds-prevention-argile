import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { AccessErrorCode } from "@/features/auth/permissions/domain";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";

// Mock des dépendances AVANT les imports
vi.mock("@/features/auth/permissions/services/permissions.service", () => ({
  checkBackofficePermission: vi.fn(),
}));

vi.mock("../services/users-tracking.service", () => ({
  getUsersWithParcours: vi.fn(),
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

// Import des actions APRÈS les mocks
import { getUsersWithParcours } from "./users-tracking.actions";

// Import des mocks
import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { getUsersWithParcours as getUsersWithParcoursService } from "../services/users-tracking.service";

describe("users-tracking.actions", () => {
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

  // Helper pour créer un utilisateur avec parcours de test
  const createMockUserWithParcours = () => ({
    id: "user-123",
    email: "user@example.com",
    nom: "Dupont",
    prenom: "Jean",
    createdAt: new Date(),
    hasEligibilite: true,
    hasDiagnostic: false,
    hasDevis: false,
    hasFacture: false,
    eligibiliteStatus: "completed",
    diagnosticStatus: null,
    devisStatus: null,
    factureStatus: null,
    lastActivity: new Date(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getUsersWithParcours", () => {
    it("devrait autoriser l'accès pour SUPER_ADMINISTRATEUR", async () => {
      const mockUser = createMockUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockUsers = [
        createMockUserWithParcours(),
        { ...createMockUserWithParcours(), id: "user-456", email: "autre@example.com" },
      ];

      vi.mocked(getUsersWithParcoursService).mockResolvedValue(mockUsers);

      const result = await getUsersWithParcours();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockUsers);
        expect(result.data).toHaveLength(2);
      }
      expect(checkBackofficePermission).toHaveBeenCalledWith(BackofficePermission.USERS_READ);
      expect(getUsersWithParcoursService).toHaveBeenCalled();
    });

    it("devrait autoriser l'accès pour ADMINISTRATEUR", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockUsers = [createMockUserWithParcours()];
      vi.mocked(getUsersWithParcoursService).mockResolvedValue(mockUsers);

      const result = await getUsersWithParcours();

      expect(result.success).toBe(true);
      expect(checkBackofficePermission).toHaveBeenCalled();
    });

    it("devrait refuser l'accès pour ANALYSTE (pas de permission USERS_READ)", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour consulter les utilisateurs",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const result = await getUsersWithParcours();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Permission insuffisante pour consulter les utilisateurs");
      }
      expect(getUsersWithParcoursService).not.toHaveBeenCalled();
    });

    it("devrait refuser l'accès pour AMO", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour consulter les utilisateurs",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const result = await getUsersWithParcours();

      expect(result.success).toBe(false);
      expect(getUsersWithParcoursService).not.toHaveBeenCalled();
    });

    it("devrait refuser l'accès pour PARTICULIER", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour consulter les utilisateurs",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const result = await getUsersWithParcours();

      expect(result.success).toBe(false);
      expect(getUsersWithParcoursService).not.toHaveBeenCalled();
    });

    it("devrait retourner une liste vide si aucun utilisateur", async () => {
      const mockUser = createMockUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(getUsersWithParcoursService).mockResolvedValue([]);

      const result = await getUsersWithParcours();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it("devrait gérer les erreurs de récupération", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(getUsersWithParcoursService).mockRejectedValue(new Error("Erreur de base de données"));

      const result = await getUsersWithParcours();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Erreur de base de données");
      }
    });

    it("devrait gérer les erreurs inconnues", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(getUsersWithParcoursService).mockRejectedValue("Erreur non-Error");

      const result = await getUsersWithParcours();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Erreur inconnue");
      }
    });

    it("devrait gérer les timeouts de base de données", async () => {
      const mockUser = createMockUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(getUsersWithParcoursService).mockRejectedValue(new Error("Connection timeout"));

      const result = await getUsersWithParcours();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Connection timeout");
      }
    });

    it("devrait vérifier la permission USERS_READ et non USERS_STATS_READ", async () => {
      const mockUser = createMockUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockUsers = [createMockUserWithParcours()];
      vi.mocked(getUsersWithParcoursService).mockResolvedValue(mockUsers);

      await getUsersWithParcours();

      // Vérifie que c'est bien USERS_READ qui est demandé (pas USERS_STATS_READ)
      expect(checkBackofficePermission).toHaveBeenCalledWith(BackofficePermission.USERS_READ);
      expect(checkBackofficePermission).not.toHaveBeenCalledWith(BackofficePermission.USERS_STATS_READ);
    });
  });

  describe("Sécurité et cas limites", () => {
    it("devrait empêcher l'accès sans authentification", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Utilisateur non authentifié",
        errorCode: AccessErrorCode.NOT_AUTHENTICATED,
      });

      const result = await getUsersWithParcours();

      expect(result.success).toBe(false);
      expect(getUsersWithParcoursService).not.toHaveBeenCalled();
    });

    it("devrait gérer les résultats avec des données complètes", async () => {
      const mockUser = createMockUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockUserComplete = {
        ...createMockUserWithParcours(),
        hasEligibilite: true,
        hasDiagnostic: true,
        hasDevis: true,
        hasFacture: true,
        eligibiliteStatus: "completed",
        diagnosticStatus: "in_progress",
        devisStatus: "approved",
        factureStatus: "paid",
      };

      vi.mocked(getUsersWithParcoursService).mockResolvedValue([mockUserComplete]);

      const result = await getUsersWithParcours();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].hasDiagnostic).toBe(true);
        expect(result.data[0].hasDevis).toBe(true);
        expect(result.data[0].hasFacture).toBe(true);
      }
    });

    it("devrait gérer les résultats avec des données partielles", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockUserPartial = {
        ...createMockUserWithParcours(),
        hasEligibilite: true,
        hasDiagnostic: false,
        hasDevis: false,
        hasFacture: false,
        diagnosticStatus: null,
        devisStatus: null,
        factureStatus: null,
      };

      vi.mocked(getUsersWithParcoursService).mockResolvedValue([mockUserPartial]);

      const result = await getUsersWithParcours();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].hasEligibilite).toBe(true);
        expect(result.data[0].hasDiagnostic).toBe(false);
        expect(result.data[0].hasDevis).toBe(false);
      }
    });
  });
});
