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
    findIdBySiret: vi.fn(),
    creer: vi.fn(),
    mettreAJour: vi.fn(),
    desactiver: vi.fn(),
    reactiver: vi.fn(),
  },
}));
vi.mock("@/shared/database/client", () => ({
  db: { transaction: vi.fn((fn: (tx: unknown) => unknown) => fn("tx")) },
}));
vi.mock("../services/experts-import.service", () => ({ importerExperts: vi.fn() }));

import {
  creerExpertAction,
  desactiverExpertAction,
  getExpertsAdministrationAction,
  importerExpertsAction,
  modifierExpertAction,
  reactiverExpertAction,
} from "./experts-admin.actions";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { expertsRepository } from "@/shared/database/repositories/experts.repository";
import { importerExperts } from "../services/experts-import.service";

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

const SAISIE = {
  nom: "Géotech",
  siret: "39248872200027",
  departements: [{ code: "36", email: "indre@exemple.fr", telephone: "" }],
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
    vi.mocked(expertsRepository.findAll).mockResolvedValue([EXPERT_EN_BASE]);
  });

  describe("getExpertsAdministrationAction", () => {
    it("donne au super-administrateur le contact interne", async () => {
      connecter(UserRole.SUPER_ADMINISTRATEUR);
      const result = await getExpertsAdministrationAction();
      expect(result.success && result.data.gestion).toBe(true);
      expect(JSON.stringify(result)).toContain("interne@exemple.fr");
    });

    it("ne renvoie jamais le contact interne à l'administrateur", async () => {
      connecter(UserRole.ADMINISTRATEUR);
      const result = await getExpertsAdministrationAction();
      expect(result.success && result.data.gestion).toBe(false);
      expect(JSON.stringify(result)).not.toContain("interne@exemple.fr");
      expect(JSON.stringify(result)).not.toContain("Camille Interne");
    });

    it.each([UserRole.ANALYSTE, UserRole.AMO, UserRole.ALLERS_VERS, UserRole.PARTICULIER])(
      "refuse l'annuaire complet à %s : ils passent par l'espace agent, filtré",
      async (role) => {
        connecter(role);
        const result = await getExpertsAdministrationAction();
        expect(result.success).toBe(false);
        expect(expertsRepository.findAll).not.toHaveBeenCalled();
      }
    );

    it("refuse un visiteur non connecté", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);
      expect((await getExpertsAdministrationAction()).success).toBe(false);
    });
  });

  describe("écriture", () => {
    const formData = () => {
      const donnees = new FormData();
      donnees.append("file", new File(["x"], "experts.xlsx"));
      return donnees;
    };

    it.each(ROLES_SANS_GESTION)("refuse toute écriture à %s, sans toucher la base", async (role) => {
      connecter(role);
      const resultats = await Promise.all([
        creerExpertAction(SAISIE),
        modifierExpertAction({ ...SAISIE, id: EXPERT_EN_BASE.id }),
        desactiverExpertAction({ id: EXPERT_EN_BASE.id, raison: "Départ" }),
        reactiverExpertAction({ id: EXPERT_EN_BASE.id }),
        importerExpertsAction(formData()),
      ]);
      expect(resultats.every((r) => !r.success)).toBe(true);
      expect(expertsRepository.creer).not.toHaveBeenCalled();
      expect(expertsRepository.mettreAJour).not.toHaveBeenCalled();
      expect(expertsRepository.desactiver).not.toHaveBeenCalled();
      expect(expertsRepository.reactiver).not.toHaveBeenCalled();
      expect(importerExperts).not.toHaveBeenCalled();
    });

    it("crée un expert pour le super-administrateur", async () => {
      connecter(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(expertsRepository.findIdBySiret).mockResolvedValue(null);
      vi.mocked(expertsRepository.creer).mockResolvedValue("nouvel-id");

      expect((await creerExpertAction(SAISIE)).success).toBe(true);
      expect(expertsRepository.creer).toHaveBeenCalledWith(
        expect.objectContaining({ siret: "39248872200027", departements: [expect.objectContaining({ code: "36" })] }),
        "tx"
      );
    });

    it("refuse un SIRET déjà pris, avec un message lisible", async () => {
      connecter(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(expertsRepository.findIdBySiret).mockResolvedValue("autre-id");
      expect(await creerExpertAction(SAISIE)).toEqual({
        success: false,
        error: "Un expert existe déjà avec ce SIRET",
      });
    });

    it("refuse une saisie invalide avant d'atteindre la base", async () => {
      connecter(UserRole.SUPER_ADMINISTRATEUR);
      const result = await creerExpertAction({ ...SAISIE, siret: "123" });
      expect(result.success).toBe(false);
      expect(expertsRepository.findIdBySiret).not.toHaveBeenCalled();
    });

    it("exige un motif pour désactiver, et note qui désactive", async () => {
      connecter(UserRole.SUPER_ADMINISTRATEUR);
      expect((await desactiverExpertAction({ id: EXPERT_EN_BASE.id, raison: " " })).success).toBe(false);

      vi.mocked(expertsRepository.desactiver).mockResolvedValue(true);
      expect((await desactiverExpertAction({ id: EXPERT_EN_BASE.id, raison: "Départ" })).success).toBe(true);
      expect(expertsRepository.desactiver).toHaveBeenCalledWith(EXPERT_EN_BASE.id, "agent-1", "Départ");
    });

    it("refuse un fichier qui n'est pas un .xlsx", async () => {
      connecter(UserRole.SUPER_ADMINISTRATEUR);
      const donnees = new FormData();
      donnees.append("file", new File(["x"], "experts.csv"));
      expect((await importerExpertsAction(donnees)).success).toBe(false);
      expect(importerExperts).not.toHaveBeenCalled();
    });
  });
});
