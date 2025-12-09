import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  checkUserAccess,
  checkRoleAccess,
  checkAdminAccess,
  checkAmoAccess,
  checkParticulierAccess,
  checkAgentAccess,
  checkProConnectAccess,
  checkFranceConnectAccess,
  checkAccessWithOptions,
  checkBackofficePermission,
  checkTabAccess,
  hasRequiredRole,
  isCurrentUserAdmin,
  isCurrentUserAmo,
  isCurrentUserParticulier,
  toActionResult,
} from "./permissions.service";
import { BackofficePermission } from "../domain/value-objects/rbac-permissions";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { AccessErrorCode } from "../domain";
import type { AuthUser } from "@/features/auth/domain/entities";

// Mock du service user
vi.mock("@/features/auth/services/user.service", () => ({
  getCurrentUser: vi.fn(),
}));

// Import du mock après la déclaration
import { getCurrentUser } from "@/features/auth/services/user.service";

describe("permissions.service", () => {
  // Helper pour créer un utilisateur de test
  const createMockUser = (role: UserRole, authMethod = "proconnect"): AuthUser => ({
    id: "user-123",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    loginTime: new Date().toISOString(),
    role,
    authMethod,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("checkUserAccess", () => {
    it("devrait retourner hasAccess: true si l'utilisateur est authentifié", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkUserAccess();

      expect(result.hasAccess).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.errorCode).toBeUndefined();
    });

    it("devrait retourner hasAccess: false si l'utilisateur n'est pas authentifié", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const result = await checkUserAccess();

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe("Utilisateur non authentifié");
      expect(result.errorCode).toBe(AccessErrorCode.NOT_AUTHENTICATED);
      expect(result.user).toBeUndefined();
    });
  });

  describe("checkRoleAccess", () => {
    it("devrait autoriser l'accès si l'utilisateur a un des rôles requis", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkRoleAccess([UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMINISTRATEUR]);

      expect(result.hasAccess).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it("devrait refuser l'accès si l'utilisateur n'a aucun des rôles requis", async () => {
      const mockUser = createMockUser(UserRole.ANALYSTE);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkRoleAccess([UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMINISTRATEUR]);

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toContain("Rôle insuffisant");
      expect(result.errorCode).toBe(AccessErrorCode.INSUFFICIENT_ROLE);
    });

    it("devrait refuser l'accès si l'utilisateur n'est pas authentifié", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const result = await checkRoleAccess([UserRole.ADMINISTRATEUR]);

      expect(result.hasAccess).toBe(false);
      expect(result.errorCode).toBe(AccessErrorCode.NOT_AUTHENTICATED);
    });
  });

  describe("checkAdminAccess", () => {
    it("devrait autoriser l'accès pour SUPER_ADMINISTRATEUR", async () => {
      const mockUser = createMockUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkAdminAccess();

      expect(result.hasAccess).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it("devrait autoriser l'accès pour ADMINISTRATEUR", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkAdminAccess();

      expect(result.hasAccess).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it("devrait refuser l'accès pour ANALYSTE", async () => {
      const mockUser = createMockUser(UserRole.ANALYSTE);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkAdminAccess();

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe("Accès réservé aux administrateurs");
      expect(result.errorCode).toBe(AccessErrorCode.INSUFFICIENT_ROLE);
    });

    it("devrait refuser l'accès pour AMO", async () => {
      const mockUser = createMockUser(UserRole.AMO);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkAdminAccess();

      expect(result.hasAccess).toBe(false);
    });

    it("devrait refuser l'accès pour PARTICULIER", async () => {
      const mockUser = createMockUser(UserRole.PARTICULIER);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkAdminAccess();

      expect(result.hasAccess).toBe(false);
    });
  });

  describe("checkAmoAccess", () => {
    it("devrait autoriser l'accès pour AMO", async () => {
      const mockUser = createMockUser(UserRole.AMO);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkAmoAccess();

      expect(result.hasAccess).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it("devrait refuser l'accès pour ADMINISTRATEUR", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkAmoAccess();

      expect(result.hasAccess).toBe(false);
    });
  });

  describe("checkParticulierAccess", () => {
    it("devrait autoriser l'accès pour PARTICULIER", async () => {
      const mockUser = createMockUser(UserRole.PARTICULIER);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkParticulierAccess();

      expect(result.hasAccess).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it("devrait refuser l'accès pour ADMINISTRATEUR", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkParticulierAccess();

      expect(result.hasAccess).toBe(false);
    });
  });

  describe("checkAgentAccess", () => {
    it("devrait autoriser l'accès pour SUPER_ADMINISTRATEUR", async () => {
      const mockUser = createMockUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkAgentAccess();

      expect(result.hasAccess).toBe(true);
    });

    it("devrait autoriser l'accès pour ADMINISTRATEUR", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkAgentAccess();

      expect(result.hasAccess).toBe(true);
    });

    it("devrait autoriser l'accès pour AMO", async () => {
      const mockUser = createMockUser(UserRole.AMO);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkAgentAccess();

      expect(result.hasAccess).toBe(true);
    });

    it("devrait autoriser l'accès pour ANALYSTE", async () => {
      const mockUser = createMockUser(UserRole.ANALYSTE);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkAgentAccess();

      expect(result.hasAccess).toBe(true);
    });

    it("devrait refuser l'accès pour PARTICULIER", async () => {
      const mockUser = createMockUser(UserRole.PARTICULIER);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkAgentAccess();

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe("Accès réservé aux agents");
      expect(result.errorCode).toBe(AccessErrorCode.INSUFFICIENT_ROLE);
    });
  });

  describe("checkProConnectAccess", () => {
    it("devrait autoriser l'accès si l'utilisateur est connecté via ProConnect", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR, "proconnect");
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkProConnectAccess();

      expect(result.hasAccess).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it("devrait refuser l'accès si l'utilisateur est connecté via FranceConnect", async () => {
      const mockUser = createMockUser(UserRole.PARTICULIER, "franceconnect");
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkProConnectAccess();

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe("Authentification ProConnect requise");
      expect(result.errorCode).toBe(AccessErrorCode.WRONG_AUTH_METHOD);
    });

    it("devrait refuser l'accès si l'utilisateur n'est pas authentifié", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const result = await checkProConnectAccess();

      expect(result.hasAccess).toBe(false);
      expect(result.errorCode).toBe(AccessErrorCode.NOT_AUTHENTICATED);
    });
  });

  describe("checkFranceConnectAccess", () => {
    it("devrait autoriser l'accès si l'utilisateur est connecté via FranceConnect", async () => {
      const mockUser = createMockUser(UserRole.PARTICULIER, "franceconnect");
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkFranceConnectAccess();

      expect(result.hasAccess).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it("devrait refuser l'accès si l'utilisateur est connecté via ProConnect", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR, "proconnect");
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkFranceConnectAccess();

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe("Authentification FranceConnect requise");
      expect(result.errorCode).toBe(AccessErrorCode.WRONG_AUTH_METHOD);
    });
  });

  describe("checkAccessWithOptions", () => {
    it("devrait autoriser l'accès si tous les critères sont remplis", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR, "proconnect");
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkAccessWithOptions({
        requiredRoles: [UserRole.ADMINISTRATEUR],
        requiredAuthMethod: "proconnect",
      });

      expect(result.hasAccess).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it("devrait refuser l'accès si le rôle ne correspond pas", async () => {
      const mockUser = createMockUser(UserRole.ANALYSTE, "proconnect");
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkAccessWithOptions({
        requiredRoles: [UserRole.ADMINISTRATEUR],
        requiredAuthMethod: "proconnect",
      });

      expect(result.hasAccess).toBe(false);
      expect(result.errorCode).toBe(AccessErrorCode.INSUFFICIENT_ROLE);
    });

    it("devrait refuser l'accès si la méthode d'authentification ne correspond pas", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR, "franceconnect");
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkAccessWithOptions({
        requiredRoles: [UserRole.ADMINISTRATEUR],
        requiredAuthMethod: "proconnect",
      });

      expect(result.hasAccess).toBe(false);
      expect(result.errorCode).toBe(AccessErrorCode.WRONG_AUTH_METHOD);
    });

    it("devrait autoriser l'accès sans options (pas de contraintes)", async () => {
      const mockUser = createMockUser(UserRole.ANALYSTE);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkAccessWithOptions({});

      expect(result.hasAccess).toBe(true);
      expect(result.user).toEqual(mockUser);
    });
  });

  describe("checkBackofficePermission", () => {
    it("devrait autoriser l'accès si l'utilisateur a la permission", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkBackofficePermission(BackofficePermission.AMO_WRITE);

      expect(result.hasAccess).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it("devrait refuser l'accès si l'utilisateur n'a pas la permission", async () => {
      const mockUser = createMockUser(UserRole.ANALYSTE);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkBackofficePermission(BackofficePermission.AMO_WRITE);

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toContain("Permission insuffisante");
      expect(result.errorCode).toBe(AccessErrorCode.INSUFFICIENT_PERMISSIONS);
    });

    it("devrait autoriser ANALYSTE pour STATS_READ", async () => {
      const mockUser = createMockUser(UserRole.ANALYSTE);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkBackofficePermission(BackofficePermission.STATS_READ);

      expect(result.hasAccess).toBe(true);
    });

    it("devrait refuser ANALYSTE pour AGENTS_READ", async () => {
      const mockUser = createMockUser(UserRole.ANALYSTE);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkBackofficePermission(BackofficePermission.AGENTS_READ);

      expect(result.hasAccess).toBe(false);
    });

    it("devrait refuser l'accès si l'utilisateur n'est pas authentifié", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const result = await checkBackofficePermission(BackofficePermission.STATS_READ);

      expect(result.hasAccess).toBe(false);
      expect(result.errorCode).toBe(AccessErrorCode.NOT_AUTHENTICATED);
    });
  });

  describe("checkTabAccess", () => {
    it("devrait autoriser l'accès à l'onglet statistiques pour ANALYSTE", async () => {
      const mockUser = createMockUser(UserRole.ANALYSTE);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkTabAccess("statistiques");

      expect(result.hasAccess).toBe(true);
    });

    it("devrait autoriser l'accès à l'onglet users pour ANALYSTE", async () => {
      const mockUser = createMockUser(UserRole.ANALYSTE);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkTabAccess("users");

      expect(result.hasAccess).toBe(true);
    });

    it("devrait refuser l'accès à l'onglet agents pour ANALYSTE", async () => {
      const mockUser = createMockUser(UserRole.ANALYSTE);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkTabAccess("agents");

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toContain("Accès refusé à l'onglet");
      expect(result.errorCode).toBe(AccessErrorCode.INSUFFICIENT_PERMISSIONS);
    });

    it("devrait refuser l'accès à l'onglet agents pour ADMINISTRATEUR", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkTabAccess("agents");

      expect(result.hasAccess).toBe(false);
    });

    it("devrait autoriser l'accès à l'onglet agents pour SUPER_ADMINISTRATEUR", async () => {
      const mockUser = createMockUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkTabAccess("agents");

      expect(result.hasAccess).toBe(true);
    });

    it("devrait autoriser l'accès à un onglet inexistant par défaut", async () => {
      const mockUser = createMockUser(UserRole.ANALYSTE);
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await checkTabAccess("onglet-inexistant");

      expect(result.hasAccess).toBe(true);
    });

    it("devrait refuser l'accès si l'utilisateur n'est pas authentifié", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const result = await checkTabAccess("statistiques");

      expect(result.hasAccess).toBe(false);
      expect(result.errorCode).toBe(AccessErrorCode.NOT_AUTHENTICATED);
    });
  });

  describe("Helper functions", () => {
    describe("hasRequiredRole", () => {
      it("devrait retourner true si l'utilisateur a un des rôles requis", async () => {
        const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
        vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

        const result = await hasRequiredRole([UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMINISTRATEUR]);

        expect(result).toBe(true);
      });

      it("devrait retourner false si l'utilisateur n'a aucun des rôles requis", async () => {
        const mockUser = createMockUser(UserRole.ANALYSTE);
        vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

        const result = await hasRequiredRole([UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMINISTRATEUR]);

        expect(result).toBe(false);
      });
    });

    describe("isCurrentUserAdmin", () => {
      it("devrait retourner true pour ADMINISTRATEUR", async () => {
        const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
        vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

        const result = await isCurrentUserAdmin();

        expect(result).toBe(true);
      });

      it("devrait retourner false pour ANALYSTE", async () => {
        const mockUser = createMockUser(UserRole.ANALYSTE);
        vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

        const result = await isCurrentUserAdmin();

        expect(result).toBe(false);
      });
    });

    describe("isCurrentUserAmo", () => {
      it("devrait retourner true pour AMO", async () => {
        const mockUser = createMockUser(UserRole.AMO);
        vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

        const result = await isCurrentUserAmo();

        expect(result).toBe(true);
      });

      it("devrait retourner false pour ADMINISTRATEUR", async () => {
        const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
        vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

        const result = await isCurrentUserAmo();

        expect(result).toBe(false);
      });
    });

    describe("isCurrentUserParticulier", () => {
      it("devrait retourner true pour PARTICULIER", async () => {
        const mockUser = createMockUser(UserRole.PARTICULIER);
        vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

        const result = await isCurrentUserParticulier();

        expect(result).toBe(true);
      });

      it("devrait retourner false pour ADMINISTRATEUR", async () => {
        const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
        vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

        const result = await isCurrentUserParticulier();

        expect(result).toBe(false);
      });
    });
  });

  describe("toActionResult", () => {
    it("devrait convertir un AccessCheckResult avec succès en ActionResult", () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      const accessResult = {
        hasAccess: true,
        user: mockUser,
      };

      const result = toActionResult(accessResult);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockUser);
      }
    });

    it("devrait convertir un AccessCheckResult avec échec en ActionResult", () => {
      const accessResult = {
        hasAccess: false,
        reason: "Accès refusé",
        errorCode: AccessErrorCode.INSUFFICIENT_ROLE,
      };

      const result = toActionResult(accessResult);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Accès refusé");
      }
    });

    it("devrait utiliser un message par défaut si aucune raison n'est fournie", () => {
      const accessResult = {
        hasAccess: false,
        errorCode: AccessErrorCode.INSUFFICIENT_ROLE,
      };

      const result = toActionResult(accessResult);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Accès refusé");
      }
    });
  });
});
