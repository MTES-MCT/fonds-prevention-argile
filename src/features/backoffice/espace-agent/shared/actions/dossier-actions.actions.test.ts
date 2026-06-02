import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getActionsAction,
  createActionAction,
  updateActionAction,
  deleteActionAction,
} from "./dossier-actions.actions";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { actionsService } from "../services/actions.service";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import type { ActionDetail } from "../domain/types/action.types";

// Mock des dépendances
vi.mock("@/features/backoffice/shared/actions/agent.actions", () => ({
  getCurrentAgent: vi.fn(),
}));

vi.mock("@/features/backoffice/shared/actions/super-admin-access", () => ({
  assertNotSuperAdminReadOnly: vi.fn().mockResolvedValue(null),
}));

vi.mock("../services/actions.service", () => ({
  actionsService: {
    getActionsForParcours: vi.fn(),
    createAction: vi.fn(),
    updateAction: vi.fn(),
    deleteAction: vi.fn(),
  },
}));

describe("dossier-actions.actions", () => {
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
    lastLogin: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockActionDetail: ActionDetail = {
    id: "action-1",
    parcoursId: "parcours-1",
    actionType: "appel_effectue",
    actionPrecision: null,
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getActionsAction", () => {
    it("retourne une liste vide si l'agent n'est pas connecté", async () => {
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: false, error: "Non connecté" });

      const result = await getActionsAction("parcours-1");

      expect(result.actions).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(actionsService.getActionsForParcours).not.toHaveBeenCalled();
    });

    it("appelle le service avec les bonnes informations", async () => {
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: true, data: mockAgent });
      vi.mocked(actionsService.getActionsForParcours).mockResolvedValue({ actions: [], totalCount: 0 });

      await getActionsAction("parcours-1");

      expect(actionsService.getActionsForParcours).toHaveBeenCalledWith(
        "parcours-1",
        "agent-1",
        UserRole.AMO,
        "amo-1",
        null
      );
    });

    it("gère les erreurs et retourne une liste vide", async () => {
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: true, data: mockAgent });
      vi.mocked(actionsService.getActionsForParcours).mockRejectedValue(new Error("Database error"));

      const result = await getActionsAction("parcours-1");

      expect(result.actions).toEqual([]);
      expect(result.totalCount).toBe(0);
    });
  });

  describe("createActionAction", () => {
    it("retourne une erreur si l'agent n'est pas connecté", async () => {
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: false, error: "Non connecté" });

      const result = await createActionAction("parcours-1", { actionType: "appel_effectue" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("connecté");
      expect(actionsService.createAction).not.toHaveBeenCalled();
    });

    it("appelle le service avec les bons paramètres", async () => {
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: true, data: mockAgent });
      vi.mocked(actionsService.createAction).mockResolvedValue({ success: true, action: mockActionDetail });

      await createActionAction("parcours-1", { actionType: "appel_effectue", message: "Test message" });

      expect(actionsService.createAction).toHaveBeenCalledWith("parcours-1", "agent-1", UserRole.AMO, {
        actionType: "appel_effectue",
        message: "Test message",
      });
    });

    it("retourne le résultat du service", async () => {
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: true, data: mockAgent });
      const mockResult = { success: true as const, action: mockActionDetail };
      vi.mocked(actionsService.createAction).mockResolvedValue(mockResult);

      const result = await createActionAction("parcours-1", { actionType: "appel_effectue" });

      expect(result).toEqual(mockResult);
    });
  });

  describe("updateActionAction", () => {
    it("retourne une erreur si l'agent n'est pas connecté", async () => {
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: false, error: "Non connecté" });

      const result = await updateActionAction("action-1", "Updated message");

      expect(result.success).toBe(false);
      expect(result.error).toContain("connecté");
      expect(actionsService.updateAction).not.toHaveBeenCalled();
    });

    it("appelle le service avec les bons paramètres", async () => {
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: true, data: mockAgent });
      vi.mocked(actionsService.updateAction).mockResolvedValue({ success: true, action: mockActionDetail });

      await updateActionAction("action-1", "Updated message");

      expect(actionsService.updateAction).toHaveBeenCalledWith("action-1", "agent-1", UserRole.AMO, "Updated message");
    });
  });

  describe("deleteActionAction", () => {
    it("retourne une erreur si l'agent n'est pas connecté", async () => {
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: false, error: "Non connecté" });

      const result = await deleteActionAction("action-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("connecté");
      expect(actionsService.deleteAction).not.toHaveBeenCalled();
    });

    it("appelle le service avec les bons paramètres", async () => {
      vi.mocked(getCurrentAgent).mockResolvedValue({ success: true, data: mockAgent });
      vi.mocked(actionsService.deleteAction).mockResolvedValue({ success: true });

      await deleteActionAction("action-1");

      expect(actionsService.deleteAction).toHaveBeenCalledWith("action-1", "agent-1", UserRole.AMO);
    });
  });
});
