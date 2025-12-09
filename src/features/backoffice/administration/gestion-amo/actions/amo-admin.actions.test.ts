import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { importAmoFromExcel, updateAmo, deleteAmo } from "./amo-admin.actions";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import type { Amo } from "@/features/parcours/amo";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { AccessErrorCode } from "@/features/auth/permissions/domain";
import { createMockAuthUser, createEnvConfigMock } from "@/shared/testing/mocks";

// Mock des dépendances
vi.mock("@/features/auth/permissions/services/permissions.service", () => ({
  checkBackofficePermission: vi.fn(),
}));

vi.mock("@/features/backoffice/administration/gestion-amo/services/amo-import.service");

vi.mock("@/features/parcours/amo/services/amo-mutations.service", () => ({
  updateAmo: vi.fn(),
  deleteAmo: vi.fn(),
}));

// Mock de l'environnement serveur
vi.mock("@/shared/config/env.config", () => createEnvConfigMock());

// Import des mocks après déclaration
import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import * as amoMutationsService from "@/features/parcours/amo/services/amo-mutations.service";
import { importAmosFromExcel } from "@/features/backoffice/administration/gestion-amo/services/amo-import.service";

describe("amo-admin.actions", () => {
  // Helper pour créer une AMO de test
  const createMockAmo = (override?: Partial<Amo>): Amo => ({
    id: "amo-123",
    nom: "AMO Test",
    siret: "12345678901234",
    departements: "Seine-et-Marne 77, Essonne 91",
    emails: "contact@amo-test.fr;support@amo-test.fr",
    telephone: "0123456789",
    adresse: "1 rue de Test, 75001 Paris",
    ...override,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("importAmoFromExcel", () => {
    it("devrait autoriser l'import pour SUPER_ADMINISTRATEUR", async () => {
      const mockUser = createMockAuthUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockResult = {
        success: true,
        message: "Import réussi",
        stats: {
          entreprisesCreated: 5,
          entreprisesUpdated: 2,
          communesCreated: 10,
          epciCreated: 3,
        },
      };

      vi.mocked(importAmosFromExcel).mockResolvedValue(mockResult);

      const formData = new FormData();
      formData.append("file", new Blob(["test"]), "amos.xlsx");

      const result = await importAmoFromExcel(formData, false);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Import réussi");
      expect(result.stats?.entreprisesCreated).toBe(5);
      expect(checkBackofficePermission).toHaveBeenCalledWith(BackofficePermission.AMO_IMPORT);
    });

    it("devrait autoriser l'import pour ADMINISTRATEUR", async () => {
      const mockUser = createMockAuthUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockResult = {
        success: true,
        message: "Import réussi",
      };

      vi.mocked(importAmosFromExcel).mockResolvedValue(mockResult);

      const formData = new FormData();
      const result = await importAmoFromExcel(formData, false);

      expect(result.success).toBe(true);
      expect(checkBackofficePermission).toHaveBeenCalled();
    });

    it("devrait refuser l'import pour ANALYSTE", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour importer des AMO",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const formData = new FormData();
      const result = await importAmoFromExcel(formData, false);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Permission insuffisante pour importer des AMO");
      expect(importAmosFromExcel).not.toHaveBeenCalled();
    });

    it("devrait refuser l'import pour AMO", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour importer des AMO",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const formData = new FormData();
      const result = await importAmoFromExcel(formData, false);

      expect(result.success).toBe(false);
      expect(importAmosFromExcel).not.toHaveBeenCalled();
    });

    it("devrait refuser l'import pour PARTICULIER", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour importer des AMO",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const formData = new FormData();
      const result = await importAmoFromExcel(formData, false);

      expect(result.success).toBe(false);
    });

    it("devrait gérer les erreurs d'import", async () => {
      const mockUser = createMockAuthUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(importAmosFromExcel).mockResolvedValue({
        success: false,
        message: "Erreur lors du parsing du fichier Excel",
        errors: ["Ligne 5: SIRET invalide"],
      });

      const formData = new FormData();
      const result = await importAmoFromExcel(formData, false);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Erreur lors du parsing");
    });

    it("devrait passer le flag clearExisting au service", async () => {
      const mockUser = createMockAuthUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(importAmosFromExcel).mockResolvedValue({
        success: true,
        message: "Import réussi",
      });

      const formData = new FormData();
      await importAmoFromExcel(formData, true);

      expect(importAmosFromExcel).toHaveBeenCalledWith(formData, true);
    });

    it("devrait gérer les exceptions inattendues", async () => {
      const mockUser = createMockAuthUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(importAmosFromExcel).mockRejectedValue(new Error("Erreur réseau"));

      const formData = new FormData();
      const result = await importAmoFromExcel(formData, false);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Erreur réseau");
    });
  });

  describe("updateAmo", () => {
    const validAmoData = {
      nom: "AMO Mise à jour",
      siret: "98765432109876",
      departements: "Paris 75",
      emails: "update@amo.fr",
      telephone: "0987654321",
      adresse: "2 rue Modifiée, 75002 Paris",
      communes: ["75056"],
      epci: ["200054781"],
    };

    it("devrait autoriser la mise à jour pour SUPER_ADMINISTRATEUR", async () => {
      const mockUser = createMockAuthUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockUpdatedAmo = createMockAmo({
        nom: validAmoData.nom,
        siret: validAmoData.siret,
      });
      vi.mocked(amoMutationsService.updateAmo).mockResolvedValue(mockUpdatedAmo);

      const result = await updateAmo("amo-123", validAmoData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockUpdatedAmo);
      }
      expect(checkBackofficePermission).toHaveBeenCalledWith(BackofficePermission.AMO_WRITE);
      expect(amoMutationsService.updateAmo).toHaveBeenCalledWith("amo-123", validAmoData);
    });

    it("devrait autoriser la mise à jour pour ADMINISTRATEUR", async () => {
      const mockUser = createMockAuthUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockUpdatedAmo = createMockAmo();
      vi.mocked(amoMutationsService.updateAmo).mockResolvedValue(mockUpdatedAmo);

      const result = await updateAmo("amo-123", validAmoData);

      expect(result.success).toBe(true);
      expect(checkBackofficePermission).toHaveBeenCalled();
    });

    it("devrait refuser la mise à jour pour ANALYSTE", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour modifier une AMO",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const result = await updateAmo("amo-123", validAmoData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Permission insuffisante pour modifier une AMO");
      }
      expect(amoMutationsService.updateAmo).not.toHaveBeenCalled();
    });

    it("devrait refuser la mise à jour pour AMO", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour modifier une AMO",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const result = await updateAmo("amo-123", validAmoData);

      expect(result.success).toBe(false);
      expect(amoMutationsService.updateAmo).not.toHaveBeenCalled();
    });

    it("devrait refuser la mise à jour pour PARTICULIER", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour modifier une AMO",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const result = await updateAmo("amo-123", validAmoData);

      expect(result.success).toBe(false);
    });

    it("devrait gérer les erreurs de mise à jour", async () => {
      const mockUser = createMockAuthUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(amoMutationsService.updateAmo).mockRejectedValue(new Error("AMO introuvable"));

      const result = await updateAmo("amo-inexistant", validAmoData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("AMO introuvable");
      }
    });

    it("devrait gérer les erreurs de validation", async () => {
      const mockUser = createMockAuthUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(amoMutationsService.updateAmo).mockRejectedValue(new Error("SIRET invalide"));

      const result = await updateAmo("amo-123", { ...validAmoData, siret: "invalid" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("SIRET invalide");
      }
    });
  });

  describe("deleteAmo", () => {
    it("devrait autoriser la suppression pour SUPER_ADMINISTRATEUR", async () => {
      const mockUser = createMockAuthUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(amoMutationsService.deleteAmo).mockResolvedValue(undefined);

      const result = await deleteAmo("amo-123");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeUndefined();
      }
      expect(checkBackofficePermission).toHaveBeenCalledWith(BackofficePermission.AMO_DELETE);
      expect(amoMutationsService.deleteAmo).toHaveBeenCalledWith("amo-123");
    });

    it("devrait autoriser la suppression pour ADMINISTRATEUR", async () => {
      const mockUser = createMockAuthUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(amoMutationsService.deleteAmo).mockResolvedValue(undefined);

      const result = await deleteAmo("amo-123");

      expect(result.success).toBe(true);
      expect(checkBackofficePermission).toHaveBeenCalled();
    });

    it("devrait refuser la suppression pour ANALYSTE", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour supprimer une AMO",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const result = await deleteAmo("amo-123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Permission insuffisante pour supprimer une AMO");
      }
      expect(amoMutationsService.deleteAmo).not.toHaveBeenCalled();
    });

    it("devrait refuser la suppression pour AMO", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour supprimer une AMO",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const result = await deleteAmo("amo-123");

      expect(result.success).toBe(false);
      expect(amoMutationsService.deleteAmo).not.toHaveBeenCalled();
    });

    it("devrait refuser la suppression pour PARTICULIER", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour supprimer une AMO",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const result = await deleteAmo("amo-123");

      expect(result.success).toBe(false);
    });

    it("devrait gérer les erreurs de suppression", async () => {
      const mockUser = createMockAuthUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(amoMutationsService.deleteAmo).mockRejectedValue(new Error("AMO introuvable"));

      const result = await deleteAmo("amo-inexistant");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("AMO introuvable");
      }
    });

    it("devrait gérer les erreurs de contrainte de clé étrangère", async () => {
      const mockUser = createMockAuthUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(amoMutationsService.deleteAmo).mockRejectedValue(
        new Error("Impossible de supprimer: AMO liée à des validations")
      );

      const result = await deleteAmo("amo-123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Impossible de supprimer");
      }
    });
  });

  describe("Sécurité et cas limites", () => {
    it("devrait empêcher l'import sans authentification", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Utilisateur non authentifié",
        errorCode: AccessErrorCode.NOT_AUTHENTICATED,
      });

      const formData = new FormData();
      const result = await importAmoFromExcel(formData, false);

      expect(result.success).toBe(false);
      expect(importAmosFromExcel).not.toHaveBeenCalled();
    });

    it("devrait empêcher la modification sans authentification", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Utilisateur non authentifié",
        errorCode: AccessErrorCode.NOT_AUTHENTICATED,
      });

      const result = await updateAmo("amo-123", {
        nom: "Test",
        departements: "Paris 75",
        emails: "test@test.fr",
      });

      expect(result.success).toBe(false);
      expect(amoMutationsService.updateAmo).not.toHaveBeenCalled();
    });

    it("devrait empêcher la suppression sans authentification", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Utilisateur non authentifié",
        errorCode: AccessErrorCode.NOT_AUTHENTICATED,
      });

      const result = await deleteAmo("amo-123");

      expect(result.success).toBe(false);
      expect(amoMutationsService.deleteAmo).not.toHaveBeenCalled();
    });
  });
});
