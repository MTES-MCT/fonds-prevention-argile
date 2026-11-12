import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { createMockAuthUser, createEnvConfigMock } from "@/shared/testing/mocks";

// Le rôle est relu en base par getCurrentUser : c'est lui qu'on simule, pas le JWT.
vi.mock("@/features/auth/services/user.service", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/shared/config/env.config", () => createEnvConfigMock());
vi.mock("@/shared/database/repositories/experts.repository", () => ({
  expertsRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    desactiver: vi.fn(),
    reactiver: vi.fn(),
  },
}));
vi.mock("@/shared/database/client", () => ({
  db: { transaction: vi.fn((fn: (tx: unknown) => unknown) => fn("tx")) },
}));

import { desactiverExpertAction, reactiverExpertAction } from "./experts-admin.actions";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { expertsRepository } from "@/shared/database/repositories/experts.repository";

const EXPERT_EN_BASE = {
  id: "11111111-1111-4111-8111-111111111111",
  nom: "Géotech",
  siret: "39248872200027",
  dateValidationDhup: "2026-05-15",
  contactInterneNom: "Camille Interne",
  contactInterneEmail: "interne@exemple.fr",
  contactInterneTelephone: "0600000000",
  desactiveAt: null,
  desactiveParNom: null,
  desactiveRaison: null,
  departements: [{ codeDepartement: "36", email: "indre@exemple.fr", telephone: "0200000000" }],
};

function connecter(role: UserRole) {
  vi.mocked(getCurrentUser).mockResolvedValue({ ...createMockAuthUser(role), agentId: "agent-1" });
}

const ROLES_SANS_GESTION = [
  UserRole.ADMINISTRATEUR,
  UserRole.ANALYSTE,
  UserRole.AMO,
  UserRole.ALLERS_VERS,
  UserRole.AMO_ET_ALLERS_VERS,
  UserRole.PARTICULIER,
];

describe("experts-admin.actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("écriture", () => {
    it.each(ROLES_SANS_GESTION)("refuse toute écriture à %s, sans toucher la base", async (role) => {
      connecter(role);
      const resultats = await Promise.all([
        desactiverExpertAction({ id: EXPERT_EN_BASE.id, raison: "Départ" }),
        reactiverExpertAction({ id: EXPERT_EN_BASE.id }),
      ]);
      expect(resultats.every((r) => !r.success)).toBe(true);
      expect(expertsRepository.desactiver).not.toHaveBeenCalled();
      expect(expertsRepository.reactiver).not.toHaveBeenCalled();
    });

    it("exige un motif pour désactiver, et note qui désactive", async () => {
      connecter(UserRole.SUPER_ADMINISTRATEUR);
      expect((await desactiverExpertAction({ id: EXPERT_EN_BASE.id, raison: " " })).success).toBe(false);

      vi.mocked(expertsRepository.desactiver).mockResolvedValue(true);
      expect((await desactiverExpertAction({ id: EXPERT_EN_BASE.id, raison: "Départ" })).success).toBe(true);
      expect(expertsRepository.desactiver).toHaveBeenCalledWith(EXPERT_EN_BASE.id, "agent-1", "Départ");
    });

  });
});
