import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCommentairesAction,
  createCommentaireAction,
  updateCommentaireAction,
  deleteCommentaireAction,
} from "./commentaires.actions";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { commentairesService } from "../services/commentaires.service";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";

// Mock des dépendances
vi.mock("@/features/backoffice/shared/actions/agent.actions", () => ({
  getCurrentAgent: vi.fn(),
}));

vi.mock("../services/commentaires.service", () => ({
  commentairesService: {
    getCommentairesForParcours: vi.fn(),
    createCommentaire: vi.fn(),
    updateCommentaire: vi.fn(),
    deleteCommentaire: vi.fn(),
  },
}));

describe("commentaires.actions", () => {
  const mockAgent = {
    id: "agent-1",
    sub: "proconnect-sub-123",
    email: "jean.dupont@example.com",
    givenName: "Jean",
    usualName: "Dupont",
    uid: null,
    siret: null,
    phone: null,
    organizationalUnit: null,
    role: UserRole.AMO as typeof UserRole.AMO,
    entrepriseAmoId: "amo-1",
    allersVersId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCommentairesAction", () => {
    it("devrait retourner une liste vide si l'agent n'est pas connecté", async () => {
      // Arrange
      vi.mocked(getCurrentAgent).mockResolvedValue({
        success: false,
        error: "Non connecté",
      });

      // Act
      const result = await getCommentairesAction("parcours-1");

      // Assert
      expect(result.commentaires).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(commentairesService.getCommentairesForParcours).not.toHaveBeenCalled();
    });

    it("devrait appeler le service avec les bonnes informations", async () => {
      // Arrange
      vi.mocked(getCurrentAgent).mockResolvedValue({
        success: true,
        data: mockAgent,
      });
      vi.mocked(commentairesService.getCommentairesForParcours).mockResolvedValue({
        commentaires: [],
        totalCount: 0,
      });

      // Act
      await getCommentairesAction("parcours-1");

      // Assert
      expect(commentairesService.getCommentairesForParcours).toHaveBeenCalledWith(
        "parcours-1",
        "agent-1",
        UserRole.AMO,
        "amo-1",
        null
      );
    });

    it("devrait retourner les commentaires du service", async () => {
      // Arrange
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: true, data: mockAgent });
      const mockCommentaires = [
        {
          id: "comment-1",
          parcoursId: "parcours-1",
          message: "Test",
          createdAt: new Date(),
          updatedAt: new Date(),
          editedAt: null,
          agent: {
            id: "agent-1",
            givenName: "Jean",
            usualName: "Dupont",
            role: UserRole.AMO,
            structureType: "AMO" as const,
            structureName: "AMO Test",
          },
        },
      ];
      vi.mocked(commentairesService.getCommentairesForParcours).mockResolvedValue({
        commentaires: mockCommentaires,
        totalCount: 1,
      });

      // Act
      const result = await getCommentairesAction("parcours-1");

      // Assert
      expect(result.commentaires).toEqual(mockCommentaires);
      expect(result.totalCount).toBe(1);
    });

    it("devrait gérer les erreurs et retourner une liste vide", async () => {
      // Arrange
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: true, data: mockAgent });
      vi.mocked(commentairesService.getCommentairesForParcours).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await getCommentairesAction("parcours-1");

      // Assert
      expect(result.commentaires).toEqual([]);
      expect(result.totalCount).toBe(0);
    });
  });

  describe("createCommentaireAction", () => {
    it("devrait retourner une erreur si l'agent n'est pas connecté", async () => {
      // Arrange
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: false, error: "Non connecté" });

      // Act
      const result = await createCommentaireAction("parcours-1", "Test message");

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("connecté");
      expect(commentairesService.createCommentaire).not.toHaveBeenCalled();
    });

    it("devrait appeler le service avec les bons paramètres", async () => {
      // Arrange
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: true, data: mockAgent });
      vi.mocked(commentairesService.createCommentaire).mockResolvedValue({
        success: true,
        commentaire: {
          id: "comment-1",
          parcoursId: "parcours-1",
          message: "Test message",
          createdAt: new Date(),
          updatedAt: new Date(),
          editedAt: null,
          agent: {
            id: "agent-1",
            givenName: "Jean",
            usualName: "Dupont",
            role: UserRole.AMO,
            structureType: "AMO",
            structureName: "AMO Test",
          },
        },
      });

      // Act
      await createCommentaireAction("parcours-1", "Test message");

      // Assert
      expect(commentairesService.createCommentaire).toHaveBeenCalledWith(
        "parcours-1",
        "agent-1",
        UserRole.AMO,
        "Test message"
      );
    });

    it("devrait retourner le résultat du service", async () => {
      // Arrange
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: true, data: mockAgent });
      const mockResult = {
        success: true as const,
        commentaire: {
          id: "comment-1",
          parcoursId: "parcours-1",
          message: "Test message",
          createdAt: new Date(),
          updatedAt: new Date(),
          editedAt: null,
          agent: {
            id: "agent-1",
            givenName: "Jean",
            usualName: "Dupont",
            role: UserRole.AMO,
            structureType: "AMO" as const,
            structureName: "AMO Test",
          },
        },
      };
      vi.mocked(commentairesService.createCommentaire).mockResolvedValue(mockResult);

      // Act
      const result = await createCommentaireAction("parcours-1", "Test message");

      // Assert
      expect(result).toEqual(mockResult);
    });

    it("devrait gérer les erreurs", async () => {
      // Arrange
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: true, data: mockAgent });
      vi.mocked(commentairesService.createCommentaire).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await createCommentaireAction("parcours-1", "Test message");

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("updateCommentaireAction", () => {
    it("devrait retourner une erreur si l'agent n'est pas connecté", async () => {
      // Arrange
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: false, error: "Non connecté" });

      // Act
      const result = await updateCommentaireAction("comment-1", "Updated message");

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("connecté");
      expect(commentairesService.updateCommentaire).not.toHaveBeenCalled();
    });

    it("devrait appeler le service avec les bons paramètres", async () => {
      // Arrange
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: true, data: mockAgent });
      vi.mocked(commentairesService.updateCommentaire).mockResolvedValue({
        success: true,
        commentaire: {
          id: "comment-1",
          parcoursId: "parcours-1",
          message: "Updated message",
          createdAt: new Date(),
          updatedAt: new Date(),
          editedAt: new Date(),
          agent: {
            id: "agent-1",
            givenName: "Jean",
            usualName: "Dupont",
            role: UserRole.AMO,
            structureType: "AMO",
            structureName: "AMO Test",
          },
        },
      });

      // Act
      await updateCommentaireAction("comment-1", "Updated message");

      // Assert
      expect(commentairesService.updateCommentaire).toHaveBeenCalledWith(
        "comment-1",
        "agent-1",
        UserRole.AMO,
        "Updated message"
      );
    });

    it("devrait retourner le résultat du service", async () => {
      // Arrange
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: true, data: mockAgent });
      const mockResult = {
        success: true as const,
        commentaire: {
          id: "comment-1",
          parcoursId: "parcours-1",
          message: "Updated message",
          createdAt: new Date(),
          updatedAt: new Date(),
          editedAt: new Date(),
          agent: {
            id: "agent-1",
            givenName: "Jean",
            usualName: "Dupont",
            role: UserRole.AMO,
            structureType: "AMO" as const,
            structureName: "AMO Test",
          },
        },
      };
      vi.mocked(commentairesService.updateCommentaire).mockResolvedValue(mockResult);

      // Act
      const result = await updateCommentaireAction("comment-1", "Updated message");

      // Assert
      expect(result).toEqual(mockResult);
    });
  });

  describe("deleteCommentaireAction", () => {
    it("devrait retourner une erreur si l'agent n'est pas connecté", async () => {
      // Arrange
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: false, error: "Non connecté" });

      // Act
      const result = await deleteCommentaireAction("comment-1");

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("connecté");
      expect(commentairesService.deleteCommentaire).not.toHaveBeenCalled();
    });

    it("devrait appeler le service avec les bons paramètres", async () => {
      // Arrange
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: true, data: mockAgent });
      vi.mocked(commentairesService.deleteCommentaire).mockResolvedValue({
        success: true,
      });

      // Act
      await deleteCommentaireAction("comment-1");

      // Assert
      expect(commentairesService.deleteCommentaire).toHaveBeenCalledWith(
        "comment-1",
        "agent-1",
        UserRole.AMO
      );
    });

    it("devrait retourner le résultat du service", async () => {
      // Arrange
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: true, data: mockAgent });
      const mockResult = { success: true as const };
      vi.mocked(commentairesService.deleteCommentaire).mockResolvedValue(mockResult);

      // Act
      const result = await deleteCommentaireAction("comment-1");

      // Assert
      expect(result).toEqual(mockResult);
    });
  });
});
