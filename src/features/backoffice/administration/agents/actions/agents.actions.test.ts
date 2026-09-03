import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AgentRole, UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { createMockJWTPayload, createMockAgentWithPermissions, createEnvConfigMock } from "@/shared/testing/mocks";

// Mock des dépendances AVANT les imports
vi.mock("@/features/auth/server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/shared/domain/value-objects", () => ({
  isSuperAdminRole: vi.fn(),
  UserRole: {
    SUPER_ADMINISTRATEUR: "super_administrateur",
    ADMINISTRATEUR: "administrateur",
    AMO: "amo",
    ANALYSTE: "analyste",
  },
}));

vi.mock("../services/agents-admin.service", () => ({
  getAllAgentsWithPermissions: vi.fn(),
  getAgentWithPermissions: vi.fn(),
  createAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
  desactiverAgent: vi.fn(),
  reactiverAgent: vi.fn(),
  getAgentTraces: vi.fn(),
}));

// Mock de l'environnement serveur
vi.mock("@/shared/config/env.config", () => createEnvConfigMock());

// Import des actions APRÈS les mocks
import {
  getAgentsAction,
  getAgentByIdAction,
  createAgentAction,
  updateAgentAction,
  deleteAgentAction,
  desactiverAgentAction,
  reactiverAgentAction,
  getAgentTracesAction,
} from "./agents.actions";

// Import des mocks
import { getSession } from "@/features/auth/server";
import { isSuperAdminRole } from "@/shared/domain/value-objects";
import * as agentsAdminService from "../services/agents-admin.service";

describe("agents.actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAgentsAction", () => {
    it("devrait autoriser l'accès pour SUPER_ADMINISTRATEUR", async () => {
      const mockSession = createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(true);

      const mockAgents = [
        createMockAgentWithPermissions({
          agent: {
            ...createMockAgentWithPermissions().agent,
            role: UserRole.SUPER_ADMINISTRATEUR,
          },
        }),
        createMockAgentWithPermissions(), // administrateur par défaut
        createMockAgentWithPermissions({
          agent: {
            ...createMockAgentWithPermissions().agent,
            role: UserRole.ANALYSTE,
          },
        }),
      ];
      vi.mocked(agentsAdminService.getAllAgentsWithPermissions).mockResolvedValue(mockAgents);

      const result = await getAgentsAction();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockAgents);
      }
      expect(agentsAdminService.getAllAgentsWithPermissions).toHaveBeenCalled();
    });

    it("devrait refuser l'accès pour ADMINISTRATEUR", async () => {
      const mockSession = createMockJWTPayload(UserRole.ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(false);

      const result = await getAgentsAction();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("super administrateurs");
      }
      expect(agentsAdminService.getAllAgentsWithPermissions).not.toHaveBeenCalled();
    });

    it("devrait refuser l'accès pour ANALYSTE", async () => {
      const mockSession = createMockJWTPayload(UserRole.ANALYSTE);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(false);

      const result = await getAgentsAction();

      expect(result.success).toBe(false);
      expect(agentsAdminService.getAllAgentsWithPermissions).not.toHaveBeenCalled();
    });

    it("devrait refuser l'accès sans session", async () => {
      vi.mocked(getSession).mockResolvedValue(null);

      const result = await getAgentsAction();

      expect(result.success).toBe(false);
      expect(agentsAdminService.getAllAgentsWithPermissions).not.toHaveBeenCalled();
    });

    it("devrait gérer les erreurs", async () => {
      const mockSession = createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(true);
      vi.mocked(agentsAdminService.getAllAgentsWithPermissions).mockRejectedValue(new Error("Database error"));

      const result = await getAgentsAction();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe("getAgentByIdAction", () => {
    it("devrait autoriser l'accès pour SUPER_ADMINISTRATEUR", async () => {
      const mockSession = createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(true);

      const mockAgent = createMockAgentWithPermissions();
      vi.mocked(agentsAdminService.getAgentWithPermissions).mockResolvedValue(mockAgent);

      const result = await getAgentByIdAction("agent-123");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockAgent);
      }
    });

    it("devrait refuser l'accès pour ADMINISTRATEUR", async () => {
      const mockSession = createMockJWTPayload(UserRole.ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(false);

      const result = await getAgentByIdAction("agent-123");

      expect(result.success).toBe(false);
      expect(agentsAdminService.getAgentWithPermissions).not.toHaveBeenCalled();
    });

    it("devrait retourner une erreur si l'agent n'existe pas", async () => {
      const mockSession = createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(true);
      vi.mocked(agentsAdminService.getAgentWithPermissions).mockResolvedValue(null);

      const result = await getAgentByIdAction("agent-inexistant");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Agent non trouvé");
      }
    });
  });

  describe("createAgentAction", () => {
    const validAgentData = {
      email: "newagent@example.com",
      givenName: "Nouvel",
      usualName: "Agent",
      role: UserRole.ADMINISTRATEUR as AgentRole,
      departements: ["75"],
    };

    it("devrait autoriser la création pour SUPER_ADMINISTRATEUR", async () => {
      const mockSession = createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(true);

      const mockCreatedAgent = createMockAgentWithPermissions();
      vi.mocked(agentsAdminService.createAgent).mockResolvedValue(mockCreatedAgent);

      const result = await createAgentAction(validAgentData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockCreatedAgent);
      }
    });

    it("devrait refuser la création pour ADMINISTRATEUR", async () => {
      const mockSession = createMockJWTPayload(UserRole.ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(false);

      const result = await createAgentAction(validAgentData);

      expect(result.success).toBe(false);
      expect(agentsAdminService.createAgent).not.toHaveBeenCalled();
    });

    it("devrait valider l'email", async () => {
      const mockSession = createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(true);

      const result = await createAgentAction({
        ...validAgentData,
        email: "invalid-email",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Email invalide");
      }
    });

    it("devrait valider le prénom", async () => {
      const mockSession = createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(true);

      const result = await createAgentAction({
        ...validAgentData,
        givenName: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Le prénom est requis");
      }
    });

    it("devrait permettre la création d'un ANALYSTE", async () => {
      const mockSession = createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(true);

      const analysteAgent = createMockAgentWithPermissions({
        agent: {
          ...createMockAgentWithPermissions().agent,
          role: UserRole.ANALYSTE,
        },
      });
      vi.mocked(agentsAdminService.createAgent).mockResolvedValue(analysteAgent);

      const result = await createAgentAction({
        ...validAgentData,
        role: UserRole.ANALYSTE,
      });

      expect(result.success).toBe(true);
    });

    it("devrait exiger une entreprise AMO pour le rôle AMO", async () => {
      const mockSession = createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(true);

      const result = await createAgentAction({
        ...validAgentData,
        role: UserRole.AMO as AgentRole,
        // pas d'entrepriseAmoId
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("entreprise AMO");
      }
    });

    it("devrait autoriser la création d'un AMO avec entreprise", async () => {
      const mockSession = createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(true);

      const mockAmoAgent = createMockAgentWithPermissions({
        agent: {
          ...createMockAgentWithPermissions().agent,
          role: UserRole.AMO,
          entrepriseAmoId: "entreprise-123",
        },
        entrepriseAmo: {
          id: "entreprise-123",
          nom: "AMO Test",
          siret: "12345678901234",
        },
      });
      vi.mocked(agentsAdminService.createAgent).mockResolvedValue(mockAmoAgent);

      const result = await createAgentAction({
        ...validAgentData,
        role: UserRole.AMO as AgentRole,
        entrepriseAmoId: "entreprise-123",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("updateAgentAction", () => {
    const validUpdateData = {
      email: "updated@example.com",
      givenName: "Modifié",
      role: UserRole.ADMINISTRATEUR as AgentRole,
    };

    it("devrait autoriser la mise à jour pour SUPER_ADMINISTRATEUR", async () => {
      const mockSession = createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(true);

      const mockUpdatedAgent = createMockAgentWithPermissions();
      vi.mocked(agentsAdminService.updateAgent).mockResolvedValue(mockUpdatedAgent);

      const result = await updateAgentAction("agent-123", validUpdateData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockUpdatedAgent);
      }
    });

    it("devrait refuser la mise à jour pour ADMINISTRATEUR", async () => {
      const mockSession = createMockJWTPayload(UserRole.ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(false);

      const result = await updateAgentAction("agent-123", validUpdateData);

      expect(result.success).toBe(false);
      expect(agentsAdminService.updateAgent).not.toHaveBeenCalled();
    });

    it("devrait valider l'email", async () => {
      const mockSession = createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(true);

      const result = await updateAgentAction("agent-123", {
        email: "invalid-email",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Email invalide");
      }
    });

    it("devrait retourner une erreur si l'agent n'existe pas", async () => {
      const mockSession = createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(true);
      vi.mocked(agentsAdminService.updateAgent).mockResolvedValue(null);

      const result = await updateAgentAction("agent-inexistant", validUpdateData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Agent non trouvé");
      }
    });

    it("devrait exiger une entreprise AMO lors du passage au rôle AMO", async () => {
      const mockSession = createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(true);

      const result = await updateAgentAction("agent-123", {
        role: UserRole.AMO as AgentRole,
        entrepriseAmoId: null, // explicitement null
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("entreprise AMO");
      }
    });
  });

  describe("deleteAgentAction", () => {
    it("devrait autoriser la suppression pour SUPER_ADMINISTRATEUR", async () => {
      const mockSession = createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(true);
      vi.mocked(agentsAdminService.deleteAgent).mockResolvedValue(true);

      const result = await deleteAgentAction("agent-123");

      expect(result.success).toBe(true);
    });

    it("devrait refuser la suppression pour ADMINISTRATEUR", async () => {
      const mockSession = createMockJWTPayload(UserRole.ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(false);

      const result = await deleteAgentAction("agent-123");

      expect(result.success).toBe(false);
      expect(agentsAdminService.deleteAgent).not.toHaveBeenCalled();
    });

    it("devrait retourner une erreur si l'agent n'existe pas", async () => {
      const mockSession = createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(true);
      vi.mocked(agentsAdminService.deleteAgent).mockResolvedValue(false);

      const result = await deleteAgentAction("agent-inexistant");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Agent non trouvé ou déjà supprimé");
      }
    });

    it("devrait gérer les erreurs", async () => {
      const mockSession = createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(true);
      vi.mocked(agentsAdminService.deleteAgent).mockRejectedValue(new Error("Contrainte DB"));

      const result = await deleteAgentAction("agent-123");

      expect(result.success).toBe(false);
    });
  });
  describe("desactiverAgentAction", () => {
    it("devrait autoriser la désactivation pour SUPER_ADMINISTRATEUR", async () => {
      const mockSession = createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(true);

      const result = await desactiverAgentAction("agent-123", "A quitté ses fonctions");

      expect(result.success).toBe(true);
      expect(agentsAdminService.desactiverAgent).toHaveBeenCalledWith(
        "agent-123",
        mockSession.userId,
        "A quitté ses fonctions"
      );
    });

    it("devrait refuser la désactivation pour ADMINISTRATEUR", async () => {
      vi.mocked(getSession).mockResolvedValue(createMockJWTPayload(UserRole.ADMINISTRATEUR));
      vi.mocked(isSuperAdminRole).mockReturnValue(false);

      const result = await desactiverAgentAction("agent-123");

      expect(result.success).toBe(false);
      expect(agentsAdminService.desactiverAgent).not.toHaveBeenCalled();
    });

    it("devrait refuser la désactivation sans session", async () => {
      vi.mocked(getSession).mockResolvedValue(null);
      vi.mocked(isSuperAdminRole).mockReturnValue(true);

      const result = await desactiverAgentAction("agent-123");

      expect(result.success).toBe(false);
      expect(agentsAdminService.desactiverAgent).not.toHaveBeenCalled();
    });

    it("devrait refuser qu'un super admin se désactive lui-même", async () => {
      const mockSession = createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(isSuperAdminRole).mockReturnValue(true);

      const result = await desactiverAgentAction(mockSession.userId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("propre compte");
      }
      expect(agentsAdminService.desactiverAgent).not.toHaveBeenCalled();
    });

    it("devrait remonter l'erreur du service", async () => {
      vi.mocked(getSession).mockResolvedValue(createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR));
      vi.mocked(isSuperAdminRole).mockReturnValue(true);
      vi.mocked(agentsAdminService.desactiverAgent).mockRejectedValue(new Error("Cet agent est déjà désactivé"));

      const result = await desactiverAgentAction("agent-123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Cet agent est déjà désactivé");
      }
    });
  });

  describe("reactiverAgentAction", () => {
    it("devrait autoriser la réactivation pour SUPER_ADMINISTRATEUR", async () => {
      vi.mocked(getSession).mockResolvedValue(createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR));
      vi.mocked(isSuperAdminRole).mockReturnValue(true);

      const result = await reactiverAgentAction("agent-123");

      expect(result.success).toBe(true);
      expect(agentsAdminService.reactiverAgent).toHaveBeenCalledWith("agent-123");
    });

    it("devrait refuser la réactivation pour ADMINISTRATEUR", async () => {
      vi.mocked(getSession).mockResolvedValue(createMockJWTPayload(UserRole.ADMINISTRATEUR));
      vi.mocked(isSuperAdminRole).mockReturnValue(false);

      const result = await reactiverAgentAction("agent-123");

      expect(result.success).toBe(false);
      expect(agentsAdminService.reactiverAgent).not.toHaveBeenCalled();
    });
  });
  describe("getAgentTracesAction", () => {
    const traces = {
      actions: 12,
      qualifications: 0,
      archivages: 0,
      dossiersCrees: 5,
      simulationsEditees: 0,
      total: 17,
    };

    it("devrait retourner le comptage pour SUPER_ADMINISTRATEUR", async () => {
      vi.mocked(getSession).mockResolvedValue(createMockJWTPayload(UserRole.SUPER_ADMINISTRATEUR));
      vi.mocked(isSuperAdminRole).mockReturnValue(true);
      vi.mocked(agentsAdminService.getAgentTraces).mockResolvedValue(traces);

      const result = await getAgentTracesAction("agent-123");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total).toBe(17);
      }
    });

    it("devrait refuser le comptage pour ADMINISTRATEUR", async () => {
      vi.mocked(getSession).mockResolvedValue(createMockJWTPayload(UserRole.ADMINISTRATEUR));
      vi.mocked(isSuperAdminRole).mockReturnValue(false);

      const result = await getAgentTracesAction("agent-123");

      expect(result.success).toBe(false);
      expect(agentsAdminService.getAgentTraces).not.toHaveBeenCalled();
    });

    it("devrait refuser le comptage sans session", async () => {
      vi.mocked(getSession).mockResolvedValue(null);
      vi.mocked(isSuperAdminRole).mockReturnValue(true);

      const result = await getAgentTracesAction("agent-123");

      expect(result.success).toBe(false);
      expect(agentsAdminService.getAgentTraces).not.toHaveBeenCalled();
    });
  });
});
