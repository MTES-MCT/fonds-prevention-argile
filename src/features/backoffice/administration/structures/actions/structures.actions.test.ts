import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { createMockAuthUser, createEnvConfigMock } from "@/shared/testing/mocks";

// Le rôle est relu en base par getCurrentUser : c'est lui qu'on simule, pas le JWT.
vi.mock("@/features/auth/services/user.service", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/shared/config/env.config", () => createEnvConfigMock());
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../services/structures-admin.service", async (importOriginal) => {
  const original = await importOriginal<typeof import("../services/structures-admin.service")>();
  return {
    RefusOperationStructure: original.RefusOperationStructure,
    listerStructures: vi.fn(),
    chargerFiche: vi.fn(),
    compterAgents: vi.fn(),
    creerStructure: vi.fn(),
    modifierIdentite: vi.fn(),
    supprimerStructure: vi.fn(),
    ajouterHabilitation: vi.fn(),
    modifierHabilitation: vi.fn(),
    retirerHabilitation: vi.fn(),
  };
});

import {
  ajouterHabilitationAction,
  creerStructureAction,
  getFicheStructureAction,
  getStructuresAction,
  modifierHabilitationAction,
  modifierIdentiteAction,
  retirerHabilitationAction,
  supprimerStructureAction,
} from "./structures.actions";
import { getCurrentUser } from "@/features/auth/services/user.service";
import * as service from "../services/structures-admin.service";

const ID = "22222222-2222-4222-8222-222222222222";
const IDENTITE = { nom: "Soliha 36", siret: "39248872200027" };
const AMO = { habilitation: "amo", structureId: ID, saisie: { departements: "Indre 36", emails: "a@amo.fr" } };
const EXPERT = { habilitation: "expert", structureId: ID, saisie: { departements: [{ code: "36" }] } };
const AMO_LUE = {
  habilitation: "amo",
  saisie: { departements: "Indre 36", emails: "a@amo.fr", communes: [], epci: [] },
};

function connecter(role: UserRole) {
  vi.mocked(getCurrentUser).mockResolvedValue(createMockAuthUser(role));
}

describe("structures.actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(service.compterAgents).mockResolvedValue(0);
  });

  const appels = [
    () => getStructuresAction(),
    () => getFicheStructureAction(ID),
    () => creerStructureAction({ identite: IDENTITE, ...AMO }),
    () => modifierIdentiteAction({ structureId: ID, identite: IDENTITE }),
    () => supprimerStructureAction(ID),
    () => ajouterHabilitationAction(AMO),
    () => modifierHabilitationAction(AMO),
    () => retirerHabilitationAction({ structureId: ID, habilitation: "amo" }),
  ];

  it.each([UserRole.ANALYSTE, UserRole.AMO, UserRole.ALLERS_VERS, UserRole.AMO_ET_ALLERS_VERS, UserRole.PARTICULIER])(
    "%s : tout est refusé, sans appel au service",
    async (role) => {
      connecter(role);

      const resultats = await Promise.all(appels.map((appel) => appel()));

      expect(resultats.every((resultat) => !resultat.success)).toBe(true);
      for (const fonction of Object.values(service)) {
        if (vi.isMockFunction(fonction)) expect(fonction).not.toHaveBeenCalled();
      }
    }
  );

  it("refuse un visiteur non connecté", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    expect((await getStructuresAction()).success).toBe(false);
    expect(service.listerStructures).not.toHaveBeenCalled();
  });

  it("ne donne les agents et les experts désactivés qu'au super-administrateur", async () => {
    vi.mocked(service.chargerFiche).mockResolvedValue({ id: ID } as never);

    connecter(UserRole.ADMINISTRATEUR);
    await getStructuresAction();
    await getFicheStructureAction(ID);
    expect(service.listerStructures).toHaveBeenLastCalledWith(false);
    expect(service.chargerFiche).toHaveBeenLastCalledWith(ID, false);

    connecter(UserRole.SUPER_ADMINISTRATEUR);
    await getStructuresAction();
    await getFicheStructureAction(ID);
    expect(service.listerStructures).toHaveBeenLastCalledWith(true);
    expect(service.chargerFiche).toHaveBeenLastCalledWith(ID, true);
  });

  it("laisse l'administrateur modifier l'identité, après validation", async () => {
    connecter(UserRole.ADMINISTRATEUR);

    expect((await modifierIdentiteAction({ structureId: ID, identite: IDENTITE })).success).toBe(true);
    expect(service.modifierIdentite).toHaveBeenCalledWith(ID, {
      nom: "Soliha 36",
      siret: "39248872200027",
      adresse: "",
      telephone: "",
      horaires: null,
    });
    expect((await modifierIdentiteAction({ structureId: "pas-un-uuid", identite: IDENTITE })).success).toBe(false);
  });

  describe("habilitations AMO et Aller-vers, qui font les rôles", () => {
    it("réserve au super-administrateur l'ajout sur une structure qui a des agents", async () => {
      vi.mocked(service.compterAgents).mockResolvedValue(2);

      connecter(UserRole.ADMINISTRATEUR);
      const refus = await ajouterHabilitationAction(AMO);
      expect(refus).toMatchObject({ success: false, error: expect.stringContaining("super-administrateur") });
      expect(service.ajouterHabilitation).not.toHaveBeenCalled();

      connecter(UserRole.SUPER_ADMINISTRATEUR);
      expect((await ajouterHabilitationAction(AMO)).success).toBe(true);
      expect(service.ajouterHabilitation).toHaveBeenCalledWith(ID, AMO_LUE);
    });

    it("laisse l'administrateur ajouter et retirer sur une structure sans agent", async () => {
      connecter(UserRole.ADMINISTRATEUR);

      expect((await ajouterHabilitationAction(AMO)).success).toBe(true);
      expect((await retirerHabilitationAction({ structureId: ID, habilitation: "amo" })).success).toBe(true);
      expect(service.retirerHabilitation).toHaveBeenCalledWith(ID, "amo");
    });

    it("réserve de même au super-administrateur le retrait sur une structure qui a des agents", async () => {
      vi.mocked(service.compterAgents).mockResolvedValue(1);
      connecter(UserRole.ADMINISTRATEUR);

      expect((await retirerHabilitationAction({ structureId: ID, habilitation: "allersVers" })).success).toBe(false);
      expect(service.retirerHabilitation).not.toHaveBeenCalled();
    });
  });

  it("réserve l'habilitation expert au super-administrateur", async () => {
    connecter(UserRole.ADMINISTRATEUR);
    expect((await ajouterHabilitationAction(EXPERT)).success).toBe(false);
    expect((await modifierHabilitationAction(EXPERT)).success).toBe(false);
    expect(service.ajouterHabilitation).not.toHaveBeenCalled();

    connecter(UserRole.SUPER_ADMINISTRATEUR);
    expect((await ajouterHabilitationAction(EXPERT)).success).toBe(true);
  });

  it("crée une structure avec sa première habilitation, sous la permission de celle-ci", async () => {
    connecter(UserRole.ADMINISTRATEUR);
    vi.mocked(service.creerStructure).mockResolvedValue("s-neuve");

    expect(await creerStructureAction({ identite: IDENTITE, ...AMO })).toEqual({
      success: true,
      data: { id: "s-neuve" },
    });
    expect(service.creerStructure).toHaveBeenCalledWith(expect.objectContaining({ nom: "Soliha 36" }), AMO_LUE);
    expect((await creerStructureAction({ identite: IDENTITE, ...EXPERT })).success).toBe(false);
  });

  it("réserve la suppression d'une structure expert au super-administrateur", async () => {
    vi.mocked(service.chargerFiche).mockResolvedValue({ id: ID, type: "expert" } as never);

    connecter(UserRole.ADMINISTRATEUR);
    expect((await supprimerStructureAction(ID)).success).toBe(false);
    expect(service.supprimerStructure).not.toHaveBeenCalled();

    connecter(UserRole.SUPER_ADMINISTRATEUR);
    expect((await supprimerStructureAction(ID)).success).toBe(true);
  });

  it("montre tel quel un refus métier, et masque une erreur inattendue", async () => {
    connecter(UserRole.SUPER_ADMINISTRATEUR);
    vi.mocked(service.chargerFiche).mockResolvedValue({ id: ID, type: "accompagnement" } as never);

    vi.mocked(service.supprimerStructure).mockRejectedValueOnce(
      new service.RefusOperationStructure("Retirez d'abord ses habilitations")
    );
    expect(await supprimerStructureAction(ID)).toEqual({ success: false, error: "Retirez d'abord ses habilitations" });

    vi.mocked(service.supprimerStructure).mockRejectedValueOnce(new Error("connexion perdue"));
    expect(await supprimerStructureAction(ID)).toEqual({
      success: false,
      error: "Erreur inattendue, l'opération n'a pas été enregistrée",
    });
  });
});
