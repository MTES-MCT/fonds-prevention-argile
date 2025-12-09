import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { importAllersVersAction, updateAllersVersAction, deleteAllAllersVers } from "./allers-vers-admin.actions";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { AccessErrorCode } from "@/features/auth/permissions/domain";
import type { AllersVers } from "@/features/seo/allers-vers";

// Mock des dépendances
vi.mock("@/features/auth/permissions/services/permissions.service", () => ({
  checkBackofficePermission: vi.fn(),
}));

vi.mock("@/features/backoffice/administration/services/allers-vers-import.service", () => ({
  importAllersVersFromExcel: vi.fn(),
}));

vi.mock("@/shared/database/repositories", () => ({
  allersVersRepository: {
    update: vi.fn(),
    updateDepartementsRelations: vi.fn(),
    updateEpciRelations: vi.fn(),
    findAll: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Import des mocks après déclaration
import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { importAllersVersFromExcel } from "@/features/backoffice/administration/services/allers-vers-import.service";
import { allersVersRepository } from "@/shared/database/repositories";
import { revalidatePath } from "next/cache";

describe("allers-vers-admin.actions", () => {
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

  // Helper pour créer un Allers Vers de test
  const createMockAllersVers = (): AllersVers => ({
    id: "av-123",
    nom: "Structure Test",
    emails: ["contact@structure.fr", "info@structure.fr"],
    telephone: "0123456789",
    adresse: "1 rue de la Structure, 75001 Paris",
  });

  // Helper pour créer un File avec arrayBuffer mocké pour les tests
  const createMockFile = (content: string, filename: string, type?: string): File => {
    const fileContent = Buffer.from(content);
    const file = new File([fileContent], filename, { type });

    // Mock arrayBuffer pour l'environnement de test Node.js
    Object.defineProperty(file, "arrayBuffer", {
      value: vi
        .fn()
        .mockResolvedValue(
          fileContent.buffer.slice(fileContent.byteOffset, fileContent.byteOffset + fileContent.byteLength)
        ),
    });

    return file;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("importAllersVersAction", () => {
    it("devrait autoriser l'import pour SUPER_ADMINISTRATEUR", async () => {
      const mockUser = createMockUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockResult = {
        success: true,
        created: 10,
        imported: 10,
        updated: 2,
        errors: [],
      };

      vi.mocked(importAllersVersFromExcel).mockResolvedValue(mockResult);

      const formData = new FormData();
      const file = createMockFile(
        "test content",
        "allers-vers.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      formData.append("file", file);

      const result = await importAllersVersAction(formData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockResult);
      }
      expect(checkBackofficePermission).toHaveBeenCalledWith("allers-vers:import");
      expect(revalidatePath).toHaveBeenCalledWith("/administration");
    });

    it("devrait autoriser l'import pour ADMINISTRATEUR", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockResult = {
        success: true,
        created: 5,
        imported: 5,
        updated: 0,
        errors: [],
      };

      vi.mocked(importAllersVersFromExcel).mockResolvedValue(mockResult);

      const formData = new FormData();
      const file = createMockFile("test", "test.xlsx");
      formData.append("file", file);

      const result = await importAllersVersAction(formData);

      expect(result.success).toBe(true);
      expect(checkBackofficePermission).toHaveBeenCalled();
    });

    it("devrait refuser l'import pour ANALYSTE", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour importer des Allers Vers",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const formData = new FormData();
      const result = await importAllersVersAction(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Permission insuffisante pour importer des Allers Vers");
      }
      expect(importAllersVersFromExcel).not.toHaveBeenCalled();
    });

    it("devrait refuser l'import pour AMO", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour importer des Allers Vers",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const formData = new FormData();
      const result = await importAllersVersAction(formData);

      expect(result.success).toBe(false);
      expect(importAllersVersFromExcel).not.toHaveBeenCalled();
    });

    it("devrait refuser l'import pour PARTICULIER", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour importer des Allers Vers",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const formData = new FormData();
      const result = await importAllersVersAction(formData);

      expect(result.success).toBe(false);
    });

    it("devrait retourner une erreur si aucun fichier n'est fourni", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const formData = new FormData();
      const result = await importAllersVersAction(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Aucun fichier fourni");
      }
      expect(importAllersVersFromExcel).not.toHaveBeenCalled();
    });

    it("devrait gérer le flag clearExisting", async () => {
      const mockUser = createMockUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockResult = {
        success: true,
        created: 10,
        imported: 10,
        updated: 0,
        errors: [],
      };

      vi.mocked(importAllersVersFromExcel).mockResolvedValue(mockResult);

      const formData = new FormData();
      const file = createMockFile("test", "test.xlsx");
      formData.append("file", file);
      formData.append("clearExisting", "true");

      const result = await importAllersVersAction(formData);

      expect(result.success).toBe(true);
      expect(importAllersVersFromExcel).toHaveBeenCalledWith(expect.any(Buffer), true);
    });

    it("devrait gérer les erreurs d'import", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockResult = {
        success: false,
        created: 0,
        imported: 0,
        updated: 0,
        errors: ["Ligne 3: Email invalide", "Ligne 5: Nom manquant"],
      };

      vi.mocked(importAllersVersFromExcel).mockResolvedValue(mockResult);

      const formData = new FormData();
      const file = createMockFile("test", "test.xlsx");
      formData.append("file", file);

      const result = await importAllersVersAction(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it("devrait gérer les exceptions inattendues", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(importAllersVersFromExcel).mockRejectedValue(new Error("Erreur de parsing Excel"));

      const formData = new FormData();
      const file = createMockFile("test", "test.xlsx");
      formData.append("file", file);

      const result = await importAllersVersAction(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Erreur lors de l'import des Allers Vers");
      }
    });
  });

  describe("updateAllersVersAction", () => {
    const validData = {
      nom: "Structure Mise à jour",
      emails: ["nouveau@structure.fr"],
      telephone: "0987654321",
      adresse: "2 rue Modifiée, 75002 Paris",
      departements: ["75", "92"],
      epci: ["200054781"],
    };

    it("devrait autoriser la mise à jour pour SUPER_ADMINISTRATEUR", async () => {
      const mockUser = createMockUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockUpdated = createMockAllersVers();
      vi.mocked(allersVersRepository.update).mockResolvedValue(mockUpdated);
      vi.mocked(allersVersRepository.updateDepartementsRelations).mockResolvedValue(undefined);
      vi.mocked(allersVersRepository.updateEpciRelations).mockResolvedValue(undefined);

      const result = await updateAllersVersAction("av-123", validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockUpdated);
      }
      expect(checkBackofficePermission).toHaveBeenCalledWith("allers-vers:write");
      expect(allersVersRepository.update).toHaveBeenCalledWith("av-123", {
        nom: validData.nom,
        emails: validData.emails,
        telephone: validData.telephone,
        adresse: validData.adresse,
      });
      expect(allersVersRepository.updateDepartementsRelations).toHaveBeenCalledWith("av-123", validData.departements);
      expect(allersVersRepository.updateEpciRelations).toHaveBeenCalledWith("av-123", validData.epci);
      expect(revalidatePath).toHaveBeenCalledWith("/administration");
      expect(revalidatePath).toHaveBeenCalledWith("/rga", "layout");
    });

    it("devrait autoriser la mise à jour pour ADMINISTRATEUR", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockUpdated = createMockAllersVers();
      vi.mocked(allersVersRepository.update).mockResolvedValue(mockUpdated);
      vi.mocked(allersVersRepository.updateDepartementsRelations).mockResolvedValue(undefined);
      vi.mocked(allersVersRepository.updateEpciRelations).mockResolvedValue(undefined);

      const result = await updateAllersVersAction("av-123", validData);

      expect(result.success).toBe(true);
      expect(checkBackofficePermission).toHaveBeenCalled();
    });

    it("devrait refuser la mise à jour pour ANALYSTE", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour modifier un Allers Vers",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const result = await updateAllersVersAction("av-123", validData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Permission insuffisante pour modifier un Allers Vers");
      }
      expect(allersVersRepository.update).not.toHaveBeenCalled();
    });

    it("devrait refuser la mise à jour pour AMO", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour modifier un Allers Vers",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const result = await updateAllersVersAction("av-123", validData);

      expect(result.success).toBe(false);
      expect(allersVersRepository.update).not.toHaveBeenCalled();
    });

    it("devrait refuser la mise à jour pour PARTICULIER", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour modifier un Allers Vers",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const result = await updateAllersVersAction("av-123", validData);

      expect(result.success).toBe(false);
    });

    it("devrait retourner une erreur si l'Allers Vers n'existe pas", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(allersVersRepository.update).mockResolvedValue(null);

      const result = await updateAllersVersAction("av-inexistant", validData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Allers Vers non trouvé");
      }
    });

    it("devrait gérer les erreurs de mise à jour", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(allersVersRepository.update).mockRejectedValue(new Error("Erreur de base de données"));

      const result = await updateAllersVersAction("av-123", validData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Impossible de mettre à jour l'Allers Vers");
      }
    });

    it("devrait mettre à jour les relations départements et EPCI", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockUpdated = createMockAllersVers();
      vi.mocked(allersVersRepository.update).mockResolvedValue(mockUpdated);
      vi.mocked(allersVersRepository.updateDepartementsRelations).mockResolvedValue(undefined);
      vi.mocked(allersVersRepository.updateEpciRelations).mockResolvedValue(undefined);

      await updateAllersVersAction("av-123", validData);

      expect(allersVersRepository.updateDepartementsRelations).toHaveBeenCalledTimes(1);
      expect(allersVersRepository.updateEpciRelations).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteAllAllersVers", () => {
    it("devrait autoriser la suppression pour SUPER_ADMINISTRATEUR", async () => {
      const mockUser = createMockUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockAllersVers = [
        createMockAllersVers(),
        { ...createMockAllersVers(), id: "av-456" },
        { ...createMockAllersVers(), id: "av-789" },
      ];

      vi.mocked(allersVersRepository.findAll).mockResolvedValue(mockAllersVers);
      vi.mocked(allersVersRepository.delete).mockResolvedValue(true);

      const result = await deleteAllAllersVers();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeUndefined();
      }
      expect(checkBackofficePermission).toHaveBeenCalledWith("allers-vers:delete");
      expect(allersVersRepository.findAll).toHaveBeenCalled();
      expect(allersVersRepository.delete).toHaveBeenCalledTimes(3);
    });

    it("devrait autoriser la suppression pour ADMINISTRATEUR", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(allersVersRepository.findAll).mockResolvedValue([]);
      vi.mocked(allersVersRepository.delete).mockResolvedValue(true);

      const result = await deleteAllAllersVers();

      expect(result.success).toBe(true);
      expect(checkBackofficePermission).toHaveBeenCalled();
    });

    it("devrait refuser la suppression pour ANALYSTE", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour supprimer des Allers Vers",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const result = await deleteAllAllersVers();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Permission insuffisante pour supprimer des Allers Vers");
      }
      expect(allersVersRepository.findAll).not.toHaveBeenCalled();
      expect(allersVersRepository.delete).not.toHaveBeenCalled();
    });

    it("devrait refuser la suppression pour AMO", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour supprimer des Allers Vers",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const result = await deleteAllAllersVers();

      expect(result.success).toBe(false);
      expect(allersVersRepository.findAll).not.toHaveBeenCalled();
    });

    it("devrait refuser la suppression pour PARTICULIER", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour supprimer des Allers Vers",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const result = await deleteAllAllersVers();

      expect(result.success).toBe(false);
    });

    it("devrait gérer une liste vide", async () => {
      const mockUser = createMockUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(allersVersRepository.findAll).mockResolvedValue([]);

      const result = await deleteAllAllersVers();

      expect(result.success).toBe(true);
      expect(allersVersRepository.delete).not.toHaveBeenCalled();
    });

    it("devrait gérer les erreurs de suppression", async () => {
      const mockUser = createMockUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockAllersVers = [createMockAllersVers()];
      vi.mocked(allersVersRepository.findAll).mockResolvedValue(mockAllersVers);
      vi.mocked(allersVersRepository.delete).mockRejectedValue(new Error("Erreur de contrainte"));

      const result = await deleteAllAllersVers();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Impossible de supprimer les Allers Vers");
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
      const result = await importAllersVersAction(formData);

      expect(result.success).toBe(false);
      expect(importAllersVersFromExcel).not.toHaveBeenCalled();
    });

    it("devrait empêcher la modification sans authentification", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Utilisateur non authentifié",
        errorCode: AccessErrorCode.NOT_AUTHENTICATED,
      });

      const result = await updateAllersVersAction("av-123", {
        nom: "Test",
        emails: ["test@test.fr"],
        telephone: "0123456789",
        adresse: "Test",
        departements: ["75"],
        epci: [],
      });

      expect(result.success).toBe(false);
      expect(allersVersRepository.update).not.toHaveBeenCalled();
    });

    it("devrait empêcher la suppression sans authentification", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Utilisateur non authentifié",
        errorCode: AccessErrorCode.NOT_AUTHENTICATED,
      });

      const result = await deleteAllAllersVers();

      expect(result.success).toBe(false);
      expect(allersVersRepository.findAll).not.toHaveBeenCalled();
    });
  });
});
