import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionsService } from "./actions.service";
import { parcoursActionsRepo, agentsRepo, entreprisesAmoRepo, parcoursRepo } from "@/shared/database/repositories";
import { hasPermission } from "@/features/auth/permissions/services/rbac.service";
import { verifyProspectTerritoryAccess } from "@/features/auth/permissions/services/agent-scope.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import {
  ACTION_TYPE_VALUES,
  ACTION_TYPE_AUTRE,
  ACTION_TYPE_COMMENTAIRE_LIBRE,
  type ActionDetail,
} from "../domain/types/action.types";

// Mock des dépendances
vi.mock("@/shared/database/repositories", () => ({
  parcoursActionsRepo: {
    findByParcoursId: vi.fn(),
    create: vi.fn(),
    findByIdWithDetails: vi.fn(),
    update: vi.fn(),
    updateMessage: vi.fn(),
    canEditAction: vi.fn(),
    exists: vi.fn(),
    delete: vi.fn(),
  },
  agentsRepo: {
    findById: vi.fn(),
  },
  entreprisesAmoRepo: {
    findById: vi.fn(),
  },
  allersVersRepository: {
    findById: vi.fn(),
  },
  // Exposé pour vérifier qu'aucune action ne modifie l'éligibilité du dossier
  parcoursRepo: {
    updateSituationParticulier: vi.fn(),
  },
}));

vi.mock("@/features/auth/permissions/services/rbac.service", () => ({
  hasPermission: vi.fn(),
}));

vi.mock("@/features/auth/permissions/services/agent-scope.service", () => ({
  verifyProspectTerritoryAccess: vi.fn(),
}));

describe("ActionsService", () => {
  let service: ActionsService;

  const mockAction: ActionDetail = {
    id: "action-1",
    parcoursId: "parcours-1",
    actionType: "commentaire_libre",
    actionPrecision: null,
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

  const baseAgent = {
    id: "agent-1",
    sub: "sub-1",
    email: "jean@test.fr",
    givenName: "Jean",
    usualName: "Dupont",
    uid: null,
    siret: null,
    phone: null,
    organizationalUnit: null,
    role: UserRole.AMO as typeof UserRole.AMO,
    entrepriseAmoId: "amo-1" as string | null,
    allersVersId: null as string | null,
    lastLogin: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ActionsService();
  });

  describe("getActionsForParcours", () => {
    it("retourne une liste vide si l'agent n'a pas la permission", async () => {
      vi.mocked(hasPermission).mockReturnValue(false);

      const result = await service.getActionsForParcours("parcours-1", "agent-1", UserRole.ANALYSTE, null, null);

      expect(result.actions).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(parcoursActionsRepo.findByParcoursId).not.toHaveBeenCalled();
    });

    it("retourne toutes les actions pour un admin avec COMMENTAIRES_READ_ALL", async () => {
      vi.mocked(hasPermission).mockImplementation(
        (_role, permission) => permission === BackofficePermission.COMMENTAIRES_READ_ALL
      );
      vi.mocked(parcoursActionsRepo.findByParcoursId).mockResolvedValue([mockAction]);

      const result = await service.getActionsForParcours("parcours-1", "admin-1", UserRole.ADMINISTRATEUR, null, null);

      expect(result.actions).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(parcoursActionsRepo.findByParcoursId).toHaveBeenCalledWith("parcours-1");
    });

    it("vérifie le scope territorial pour un agent AMO avec COMMENTAIRES_READ", async () => {
      vi.mocked(hasPermission).mockImplementation(
        (_role, permission) => permission === BackofficePermission.COMMENTAIRES_READ
      );
      vi.mocked(verifyProspectTerritoryAccess).mockResolvedValue(null);
      vi.mocked(parcoursActionsRepo.findByParcoursId).mockResolvedValue([mockAction]);

      const result = await service.getActionsForParcours("parcours-1", "agent-1", UserRole.AMO, "amo-1", null);

      expect(verifyProspectTerritoryAccess).toHaveBeenCalledWith("parcours-1", {
        id: "agent-1",
        role: UserRole.AMO,
        entrepriseAmoId: "amo-1",
        allersVersId: null,
      });
      expect(result.actions).toHaveLength(1);
    });
  });

  describe("createAction", () => {
    it("refuse la création sans permission", async () => {
      vi.mocked(hasPermission).mockReturnValue(false);

      const result = await service.createAction("parcours-1", "agent-1", UserRole.ANALYSTE, {
        actionType: "commentaire_libre",
        message: "Test",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Permission refusée");
      expect(parcoursActionsRepo.create).not.toHaveBeenCalled();
    });

    it("refuse un type d'action invalide", async () => {
      vi.mocked(hasPermission).mockReturnValue(true);

      const result = await service.createAction("parcours-1", "agent-1", UserRole.AMO, {
        actionType: "type_inexistant",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Type d'action invalide");
    });

    it("refuse un commentaire libre sans message", async () => {
      vi.mocked(hasPermission).mockReturnValue(true);

      const result = await service.createAction("parcours-1", "agent-1", UserRole.AMO, {
        actionType: "commentaire_libre",
        message: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("vide");
    });

    it("refuse une action 'autre' sans précision", async () => {
      vi.mocked(hasPermission).mockReturnValue(true);

      const result = await service.createAction("parcours-1", "agent-1", UserRole.AMO, {
        actionType: "autre",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("préciser");
    });

    it("refuse un message trop long (>5000 caractères)", async () => {
      vi.mocked(hasPermission).mockReturnValue(true);

      const result = await service.createAction("parcours-1", "agent-1", UserRole.AMO, {
        actionType: "appel_effectue",
        message: "a".repeat(5001),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("5000 caractères");
    });

    it("crée une action avec snapshot auteur AMO", async () => {
      vi.mocked(hasPermission).mockReturnValue(true);
      vi.mocked(agentsRepo.findById).mockResolvedValue(baseAgent);
      vi.mocked(entreprisesAmoRepo.findById).mockResolvedValue({
        id: "amo-1",
        nom: "AMO Test",
        siret: "12345678901234",
        departements: "75",
        emails: "test@amo.fr",
        telephone: "0123456789",
        adresse: "123 rue test",
        horaires: null,
      });
      vi.mocked(parcoursActionsRepo.create).mockResolvedValue({
        id: "action-1",
        parcoursId: "parcours-1",
        agentId: "agent-1",
        actionType: "appel_effectue",
        actionPrecision: null,
        authorName: "Jean Dupont",
        authorStructure: "AMO Test",
        authorStructureType: "AMO",
        message: "Appel passé",
        createdAt: new Date(),
        updatedAt: new Date(),
        editedAt: null,
      });
      vi.mocked(parcoursActionsRepo.findByIdWithDetails).mockResolvedValue(mockAction);

      const result = await service.createAction("parcours-1", "agent-1", UserRole.AMO, {
        actionType: "appel_effectue",
        message: "Appel passé",
      });

      expect(result.success).toBe(true);
      expect(result.action).toEqual(mockAction);
      expect(parcoursActionsRepo.create).toHaveBeenCalledWith({
        parcoursId: "parcours-1",
        agentId: "agent-1",
        actionType: "appel_effectue",
        actionPrecision: null,
        message: "Appel passé",
        authorName: "Jean Dupont",
        authorStructure: "AMO Test",
        authorStructureType: "AMO",
      });
    });

    it("retourne une erreur si l'agent est introuvable", async () => {
      vi.mocked(hasPermission).mockReturnValue(true);
      vi.mocked(agentsRepo.findById).mockResolvedValue(null);

      const result = await service.createAction("parcours-1", "agent-inexistant", UserRole.AMO, {
        actionType: "appel_effectue",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Agent introuvable");
      expect(parcoursActionsRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("updateAction", () => {
    it("refuse la modification sans permission", async () => {
      vi.mocked(hasPermission).mockReturnValue(false);

      const result = await service.updateAction("action-1", "agent-1", UserRole.ANALYSTE, "Updated");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Permission refusée");
    });

    it("refuse si l'action n'existe pas", async () => {
      vi.mocked(hasPermission).mockReturnValue(true);
      vi.mocked(parcoursActionsRepo.exists).mockResolvedValue(false);

      const result = await service.updateAction("action-inexistante", "agent-1", UserRole.AMO, "Updated");

      expect(result.success).toBe(false);
      expect(result.error).toContain("n'existe pas");
      expect(parcoursActionsRepo.canEditAction).not.toHaveBeenCalled();
    });

    it("refuse si l'agent n'est pas l'auteur", async () => {
      vi.mocked(hasPermission).mockReturnValue(true);
      vi.mocked(parcoursActionsRepo.exists).mockResolvedValue(true);
      vi.mocked(parcoursActionsRepo.canEditAction).mockResolvedValue(false);

      const result = await service.updateAction("action-1", "agent-2", UserRole.AMO, "Updated");

      expect(result.success).toBe(false);
      expect(result.error).toContain("vos propres actions");
    });

    it("met à jour une action valide", async () => {
      vi.mocked(hasPermission).mockReturnValue(true);
      vi.mocked(parcoursActionsRepo.exists).mockResolvedValue(true);
      vi.mocked(parcoursActionsRepo.canEditAction).mockResolvedValue(true);
      vi.mocked(parcoursActionsRepo.updateMessage).mockResolvedValue({
        id: "action-1",
        parcoursId: "parcours-1",
        agentId: "agent-1",
        actionType: "commentaire_libre",
        actionPrecision: null,
        authorName: "Jean Dupont",
        authorStructure: "AMO Test",
        authorStructureType: "AMO",
        message: "Updated",
        createdAt: new Date(),
        updatedAt: new Date(),
        editedAt: new Date(),
      });
      vi.mocked(parcoursActionsRepo.findByIdWithDetails).mockResolvedValue({ ...mockAction, message: "Updated" });

      const result = await service.updateAction("action-1", "agent-1", UserRole.AMO, "Updated");

      expect(result.success).toBe(true);
      expect(result.action?.message).toBe("Updated");
      expect(parcoursActionsRepo.updateMessage).toHaveBeenCalledWith("action-1", "Updated");
    });
  });

  describe("deleteAction", () => {
    it("refuse la suppression sans permission", async () => {
      vi.mocked(hasPermission).mockReturnValue(false);

      const result = await service.deleteAction("action-1", "agent-1", UserRole.ANALYSTE);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Permission refusée");
    });

    it("refuse si l'action n'existe pas", async () => {
      vi.mocked(hasPermission).mockReturnValue(true);
      vi.mocked(parcoursActionsRepo.exists).mockResolvedValue(false);

      const result = await service.deleteAction("action-inexistante", "agent-1", UserRole.AMO);

      expect(result.success).toBe(false);
      expect(result.error).toContain("n'existe pas");
      expect(parcoursActionsRepo.canEditAction).not.toHaveBeenCalled();
    });

    it("supprime une action valide", async () => {
      vi.mocked(hasPermission).mockReturnValue(true);
      vi.mocked(parcoursActionsRepo.exists).mockResolvedValue(true);
      vi.mocked(parcoursActionsRepo.canEditAction).mockResolvedValue(true);
      vi.mocked(parcoursActionsRepo.delete).mockResolvedValue(true);

      const result = await service.deleteAction("action-1", "agent-1", UserRole.AMO);

      expect(result.success).toBe(true);
      expect(parcoursActionsRepo.delete).toHaveBeenCalledWith("action-1");
    });

    it("retourne une erreur si la suppression échoue", async () => {
      vi.mocked(hasPermission).mockReturnValue(true);
      vi.mocked(parcoursActionsRepo.exists).mockResolvedValue(true);
      vi.mocked(parcoursActionsRepo.canEditAction).mockResolvedValue(true);
      vi.mocked(parcoursActionsRepo.delete).mockResolvedValue(false);

      const result = await service.deleteAction("action-1", "agent-1", UserRole.AMO);

      expect(result.success).toBe(false);
      expect(result.error).toContain("pas pu être supprimée");
    });
  });
});

describe("ActionsService — accès et neutralité éligibilité", () => {
  let service: ActionsService;

  const agent = {
    id: "agent-1",
    sub: "sub-1",
    email: "agent@test.fr",
    givenName: "Jean",
    usualName: "Dupont",
    uid: null,
    siret: null,
    phone: null,
    organizationalUnit: null,
    role: UserRole.AMO as typeof UserRole.AMO,
    entrepriseAmoId: "amo-1" as string | null,
    allersVersId: null as string | null,
    lastLogin: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  /** Données minimales pour créer chaque type d'action sans déclencher de validation. */
  function dataFor(actionType: string) {
    if (actionType === ACTION_TYPE_COMMENTAIRE_LIBRE) return { actionType, message: "Un commentaire" };
    if (actionType === ACTION_TYPE_AUTRE) return { actionType, actionPrecision: "Précision libre" };
    return { actionType };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ActionsService();
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(agentsRepo.findById).mockResolvedValue(agent);
    vi.mocked(entreprisesAmoRepo.findById).mockResolvedValue({
      id: "amo-1",
      nom: "AMO Test",
      siret: "12345678901234",
      departements: "63",
      emails: "test@amo.fr",
      telephone: "0123456789",
      adresse: "1 rue test",
      horaires: null,
    });
    vi.mocked(parcoursActionsRepo.create).mockImplementation(async (data) => ({
      id: "action-x",
      parcoursId: data.parcoursId,
      agentId: data.agentId ?? null,
      actionType: data.actionType,
      actionPrecision: data.actionPrecision ?? null,
      authorName: data.authorName,
      authorStructure: data.authorStructure ?? null,
      authorStructureType: data.authorStructureType ?? null,
      message: data.message ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      editedAt: null,
    }));
    vi.mocked(parcoursActionsRepo.findByIdWithDetails).mockResolvedValue({
      id: "action-x",
      parcoursId: "parcours-1",
      actionType: "appel_effectue",
      actionPrecision: null,
      message: null,
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
    });
  });

  // Tous les types d'action de la taxonomie sont créables (aucun n'est restreint).
  it.each(ACTION_TYPE_VALUES)("crée une action de type '%s'", async (actionType) => {
    const result = await service.createAction("parcours-1", "agent-1", UserRole.AMO, dataFor(actionType));

    expect(result.success).toBe(true);
    expect(parcoursActionsRepo.create).toHaveBeenCalledWith(expect.objectContaining({ actionType }));
  });

  it("ne vérifie aucun territoire à la création (action possible sur tous les dossiers)", async () => {
    await service.createAction("parcours-1", "agent-1", UserRole.AMO, { actionType: "appel_effectue" });

    expect(verifyProspectTerritoryAccess).not.toHaveBeenCalled();
  });

  // Les actions « éligibilité » sont purement informatives : aucun impact sur le dossier.
  it.each(["semble_eligible_a_confirmer", "ne_semble_pas_eligible_a_confirmer"])(
    "l'action '%s' ne modifie pas l'éligibilité du dossier",
    async (actionType) => {
      const result = await service.createAction("parcours-1", "agent-1", UserRole.AMO, { actionType });

      expect(result.success).toBe(true);
      expect(parcoursActionsRepo.create).toHaveBeenCalledWith(expect.objectContaining({ actionType }));
      // Aucune mutation de situation_particulier / éligibilité
      expect(parcoursRepo.updateSituationParticulier).not.toHaveBeenCalled();
    }
  );
});
