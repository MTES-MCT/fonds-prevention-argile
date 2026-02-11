import { describe, it, expect, vi, beforeEach } from "vitest";
import { CommentairesService } from "./commentaires.service";
import { parcoursCommentairesRepo } from "@/shared/database/repositories";
import { hasPermission } from "@/features/auth/permissions/services/rbac.service";
import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import type { CommentaireDetail } from "../domain/types/commentaire.types";

// Mock des dépendances
vi.mock("@/shared/database/repositories", () => ({
  parcoursCommentairesRepo: {
    findByParcoursId: vi.fn(),
    create: vi.fn(),
    findByIdWithDetails: vi.fn(),
    update: vi.fn(),
    updateMessage: vi.fn(),
    canEditComment: vi.fn(),
    exists: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/features/auth/permissions/services/rbac.service", () => ({
  hasPermission: vi.fn(),
}));

vi.mock("@/features/auth/permissions/services/agent-scope.service", () => ({
  calculateAgentScope: vi.fn(),
}));

describe("CommentairesService", () => {
  let service: CommentairesService;

  const mockCommentaire: CommentaireDetail = {
    id: "comment-1",
    parcoursId: "parcours-1",
    message: "Test message",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    editedAt: null,
    agent: {
      id: "agent-1",
      givenName: "Jean",
      usualName: "Dupont",
      role: UserRole.AMO,
      structureType: "AMO",
      structureName: "AMO Test",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CommentairesService();
  });

  describe("getCommentairesForParcours", () => {
    it("devrait retourner une liste vide si l'agent n'a pas la permission", async () => {
      // Arrange
      vi.mocked(hasPermission).mockReturnValue(false);

      // Act
      const result = await service.getCommentairesForParcours(
        "parcours-1",
        "agent-1",
        UserRole.ANALYSTE,
        null,
        null
      );

      // Assert
      expect(result.commentaires).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(parcoursCommentairesRepo.findByParcoursId).not.toHaveBeenCalled();
    });

    it("devrait retourner tous les commentaires pour un admin avec COMMENTAIRES_READ_ALL", async () => {
      // Arrange
      vi.mocked(hasPermission).mockImplementation((role, permission) => {
        return permission === BackofficePermission.COMMENTAIRES_READ_ALL;
      });
      vi.mocked(parcoursCommentairesRepo.findByParcoursId).mockResolvedValue([
        mockCommentaire,
      ]);

      // Act
      const result = await service.getCommentairesForParcours(
        "parcours-1",
        "admin-1",
        UserRole.ADMINISTRATEUR,
        null,
        null
      );

      // Assert
      expect(result.commentaires).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(parcoursCommentairesRepo.findByParcoursId).toHaveBeenCalledWith("parcours-1");
    });

    it("devrait calculer le scope pour un agent AMO avec COMMENTAIRES_READ", async () => {
      // Arrange
      vi.mocked(hasPermission).mockImplementation((role, permission) => {
        return permission === BackofficePermission.COMMENTAIRES_READ;
      });
      vi.mocked(calculateAgentScope).mockResolvedValue({
        isNational: false,
        entrepriseAmoIds: ["amo-1"],
        departements: ["75"],
        epcis: [],
        canViewAllDossiers: false,
        canViewDossiersByEntreprise: true,
        canViewDossiersWithoutAmo: false,
      });
      vi.mocked(parcoursCommentairesRepo.findByParcoursId).mockResolvedValue([
        mockCommentaire,
      ]);

      // Act
      const result = await service.getCommentairesForParcours(
        "parcours-1",
        "agent-1",
        UserRole.AMO,
        "amo-1",
        null
      );

      // Assert
      expect(calculateAgentScope).toHaveBeenCalledWith({
        id: "agent-1",
        role: UserRole.AMO,
        entrepriseAmoId: "amo-1",
        allersVersId: null,
      });
      expect(result.commentaires).toHaveLength(1);
    });
  });

  describe("createCommentaire", () => {
    it("devrait refuser la création si l'agent n'a pas la permission", async () => {
      // Arrange
      vi.mocked(hasPermission).mockReturnValue(false);

      // Act
      const result = await service.createCommentaire(
        "parcours-1",
        "agent-1",
        UserRole.ANALYSTE,
        "Test message"
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Permission refusée");
      expect(parcoursCommentairesRepo.create).not.toHaveBeenCalled();
    });

    it("devrait refuser un message vide", async () => {
      // Arrange
      vi.mocked(hasPermission).mockReturnValue(true);

      // Act
      const result = await service.createCommentaire(
        "parcours-1",
        "agent-1",
        UserRole.AMO,
        ""
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("vide");
    });

    it("devrait refuser un message trop long (>5000 caractères)", async () => {
      // Arrange
      vi.mocked(hasPermission).mockReturnValue(true);
      const longMessage = "a".repeat(5001);

      // Act
      const result = await service.createCommentaire(
        "parcours-1",
        "agent-1",
        UserRole.AMO,
        longMessage
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("5000 caractères");
    });

    it("devrait créer un commentaire valide", async () => {
      // Arrange
      vi.mocked(hasPermission).mockReturnValue(true);
      vi.mocked(parcoursCommentairesRepo.create).mockResolvedValue({
        id: "comment-1",
        parcoursId: "parcours-1",
        agentId: "agent-1",
        message: "Test message",
        createdAt: new Date(),
        updatedAt: new Date(),
        editedAt: null,
      });
      vi.mocked(parcoursCommentairesRepo.findByIdWithDetails).mockResolvedValue(
        mockCommentaire
      );

      // Act
      const result = await service.createCommentaire(
        "parcours-1",
        "agent-1",
        UserRole.AMO,
        "Test message"
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.commentaire).toEqual(mockCommentaire);
      expect(parcoursCommentairesRepo.create).toHaveBeenCalledWith({
        parcoursId: "parcours-1",
        agentId: "agent-1",
        message: "Test message",
      });
    });

    it("devrait accepter un message de 5000 caractères exactement", async () => {
      // Arrange
      vi.mocked(hasPermission).mockReturnValue(true);
      const maxMessage = "a".repeat(5000);
      vi.mocked(parcoursCommentairesRepo.create).mockResolvedValue({
        id: "comment-1",
        parcoursId: "parcours-1",
        agentId: "agent-1",
        message: maxMessage,
        createdAt: new Date(),
        updatedAt: new Date(),
        editedAt: null,
      });
      vi.mocked(parcoursCommentairesRepo.findByIdWithDetails).mockResolvedValue(
        mockCommentaire
      );

      // Act
      const result = await service.createCommentaire(
        "parcours-1",
        "agent-1",
        UserRole.AMO,
        maxMessage
      );

      // Assert
      expect(result.success).toBe(true);
    });

    it("devrait trim le message avant de le sauvegarder", async () => {
      // Arrange
      vi.mocked(hasPermission).mockReturnValue(true);
      vi.mocked(parcoursCommentairesRepo.create).mockResolvedValue({
        id: "comment-1",
        parcoursId: "parcours-1",
        agentId: "agent-1",
        message: "Test message",
        createdAt: new Date(),
        updatedAt: new Date(),
        editedAt: null,
      });
      vi.mocked(parcoursCommentairesRepo.findByIdWithDetails).mockResolvedValue(
        mockCommentaire
      );

      // Act
      await service.createCommentaire(
        "parcours-1",
        "agent-1",
        UserRole.AMO,
        "  Test message  "
      );

      // Assert
      expect(parcoursCommentairesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Test message",
        })
      );
    });
  });

  describe("updateCommentaire", () => {
    it("devrait refuser la modification si l'agent n'a pas la permission", async () => {
      // Arrange
      vi.mocked(hasPermission).mockReturnValue(false);

      // Act
      const result = await service.updateCommentaire(
        "comment-1",
        "agent-1",
        UserRole.ANALYSTE,
        "Updated message"
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Permission refusée");
    });

    it("devrait refuser si le commentaire n'existe pas", async () => {
      // Arrange
      vi.mocked(hasPermission).mockReturnValue(true);
      vi.mocked(parcoursCommentairesRepo.exists).mockResolvedValue(false);

      // Act
      const result = await service.updateCommentaire(
        "comment-inexistant",
        "agent-1",
        UserRole.AMO,
        "Updated message"
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("n'existe pas");
      expect(parcoursCommentairesRepo.canEditComment).not.toHaveBeenCalled();
    });

    it("devrait refuser si l'agent n'est pas l'auteur du commentaire", async () => {
      // Arrange
      vi.mocked(hasPermission).mockReturnValue(true);
      vi.mocked(parcoursCommentairesRepo.exists).mockResolvedValue(true);
      vi.mocked(parcoursCommentairesRepo.canEditComment).mockResolvedValue(false);

      // Act
      const result = await service.updateCommentaire(
        "comment-1",
        "agent-2",
        UserRole.AMO,
        "Updated message"
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("vos propres commentaires");
    });

    it("devrait refuser un message vide", async () => {
      // Arrange
      vi.mocked(hasPermission).mockReturnValue(true);
      vi.mocked(parcoursCommentairesRepo.exists).mockResolvedValue(true);
      vi.mocked(parcoursCommentairesRepo.canEditComment).mockResolvedValue(true);

      // Act
      const result = await service.updateCommentaire(
        "comment-1",
        "agent-1",
        UserRole.AMO,
        "   "
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("vide");
    });

    it("devrait mettre à jour un commentaire valide", async () => {
      // Arrange
      vi.mocked(hasPermission).mockReturnValue(true);
      vi.mocked(parcoursCommentairesRepo.exists).mockResolvedValue(true);
      vi.mocked(parcoursCommentairesRepo.canEditComment).mockResolvedValue(true);
      const updatedComment = { ...mockCommentaire, message: "Updated", editedAt: new Date() };
      vi.mocked(parcoursCommentairesRepo.updateMessage).mockResolvedValue({
        id: "comment-1",
        parcoursId: "parcours-1",
        agentId: "agent-1",
        message: "Updated",
        createdAt: new Date(),
        updatedAt: new Date(),
        editedAt: new Date(),
      });
      vi.mocked(parcoursCommentairesRepo.findByIdWithDetails).mockResolvedValue(
        updatedComment
      );

      // Act
      const result = await service.updateCommentaire(
        "comment-1",
        "agent-1",
        UserRole.AMO,
        "Updated"
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.commentaire?.message).toBe("Updated");
      expect(parcoursCommentairesRepo.updateMessage).toHaveBeenCalledWith("comment-1", "Updated");
    });
  });

  describe("deleteCommentaire", () => {
    it("devrait refuser la suppression si l'agent n'a pas la permission", async () => {
      // Arrange
      vi.mocked(hasPermission).mockReturnValue(false);

      // Act
      const result = await service.deleteCommentaire(
        "comment-1",
        "agent-1",
        UserRole.ANALYSTE
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Permission refusée");
    });

    it("devrait refuser si le commentaire n'existe pas", async () => {
      // Arrange
      vi.mocked(hasPermission).mockReturnValue(true);
      vi.mocked(parcoursCommentairesRepo.exists).mockResolvedValue(false);

      // Act
      const result = await service.deleteCommentaire(
        "comment-inexistant",
        "agent-1",
        UserRole.AMO
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("n'existe pas");
      expect(parcoursCommentairesRepo.canEditComment).not.toHaveBeenCalled();
    });

    it("devrait refuser si l'agent n'est pas l'auteur", async () => {
      // Arrange
      vi.mocked(hasPermission).mockReturnValue(true);
      vi.mocked(parcoursCommentairesRepo.exists).mockResolvedValue(true);
      vi.mocked(parcoursCommentairesRepo.canEditComment).mockResolvedValue(false);

      // Act
      const result = await service.deleteCommentaire(
        "comment-1",
        "agent-2",
        UserRole.AMO
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("vos propres commentaires");
    });

    it("devrait supprimer un commentaire valide", async () => {
      // Arrange
      vi.mocked(hasPermission).mockReturnValue(true);
      vi.mocked(parcoursCommentairesRepo.exists).mockResolvedValue(true);
      vi.mocked(parcoursCommentairesRepo.canEditComment).mockResolvedValue(true);
      vi.mocked(parcoursCommentairesRepo.delete).mockResolvedValue(true);

      // Act
      const result = await service.deleteCommentaire(
        "comment-1",
        "agent-1",
        UserRole.AMO
      );

      // Assert
      expect(result.success).toBe(true);
      expect(parcoursCommentairesRepo.delete).toHaveBeenCalledWith("comment-1");
    });

    it("devrait retourner une erreur si la suppression échoue", async () => {
      // Arrange
      vi.mocked(hasPermission).mockReturnValue(true);
      vi.mocked(parcoursCommentairesRepo.exists).mockResolvedValue(true);
      vi.mocked(parcoursCommentairesRepo.canEditComment).mockResolvedValue(true);
      vi.mocked(parcoursCommentairesRepo.delete).mockResolvedValue(false);

      // Act
      const result = await service.deleteCommentaire(
        "comment-1",
        "agent-1",
        UserRole.AMO
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("pas pu être supprimé");
    });
  });
});
