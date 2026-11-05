import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { createMockAuthUser, createEnvConfigMock } from "@/shared/testing/mocks";

// Le rôle est relu en base par getCurrentUser : c'est lui qu'on simule, pas le JWT.
vi.mock("@/features/auth/services/user.service", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/shared/config/env.config", () => createEnvConfigMock());
vi.mock("../services/structures-admin.service", async (importOriginal) => {
  const original = await importOriginal<typeof import("../services/structures-admin.service")>();
  return {
    RefusOperationStructure: original.RefusOperationStructure,
    listerStructures: vi.fn(),
    renommerStructure: vi.fn(),
    fusionnerStructures: vi.fn(),
    detacherHabilitation: vi.fn(),
  };
});

import {
  detacherHabilitationAction,
  fusionnerStructuresAction,
  getStructuresAction,
  renommerStructureAction,
} from "./structures.actions";
import { getCurrentUser } from "@/features/auth/services/user.service";
import * as service from "../services/structures-admin.service";

const CIBLE = "22222222-2222-4222-8222-222222222222";
const SOURCE = "11111111-1111-4111-8111-111111111111";

function connecter(role: UserRole) {
  vi.mocked(getCurrentUser).mockResolvedValue(createMockAuthUser(role));
}

describe("structures.actions — réservées au super-administrateur", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  const appels = [
    ["getStructuresAction", () => getStructuresAction()],
    ["renommerStructureAction", () => renommerStructureAction({ structureId: CIBLE, nom: "Soliha 54" })],
    ["fusionnerStructuresAction", () => fusionnerStructuresAction({ cibleId: CIBLE, sourceId: SOURCE })],
    ["detacherHabilitationAction", () => detacherHabilitationAction({ structureId: CIBLE, habilitation: "amo" })],
  ] as const;

  it.each(
    [
      UserRole.ADMINISTRATEUR,
      UserRole.ANALYSTE,
      UserRole.AMO,
      UserRole.ALLERS_VERS,
      UserRole.AMO_ET_ALLERS_VERS,
    ].flatMap((role) => appels.map(([nom, appel]) => [role, nom, appel] as const))
  )("%s → %s refusé, sans appel au service", async (role, _nom, appel) => {
    connecter(role);

    const resultat = await appel();

    expect(resultat).toEqual({ success: false, error: "Accès non autorisé. Réservé aux super administrateurs." });
    expect(service.listerStructures).not.toHaveBeenCalled();
    expect(service.renommerStructure).not.toHaveBeenCalled();
    expect(service.fusionnerStructures).not.toHaveBeenCalled();
    expect(service.detacherHabilitation).not.toHaveBeenCalled();
  });

  it("refuse un visiteur non connecté", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    expect((await fusionnerStructuresAction({ cibleId: CIBLE, sourceId: SOURCE })).success).toBe(false);
    expect(service.fusionnerStructures).not.toHaveBeenCalled();
  });
});

describe("structures.actions — super-administrateur", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    connecter(UserRole.SUPER_ADMINISTRATEUR);
  });

  it("fusionne avec les identifiants validés", async () => {
    expect(await fusionnerStructuresAction({ cibleId: CIBLE, sourceId: SOURCE })).toEqual({
      success: true,
      data: undefined,
    });
    expect(service.fusionnerStructures).toHaveBeenCalledWith(CIBLE, SOURCE);
  });

  it("refuse un identifiant qui n'est pas un uuid, sans appel au service", async () => {
    expect(await fusionnerStructuresAction({ cibleId: "1 OR 1=1", sourceId: SOURCE })).toEqual({
      success: false,
      error: "Structure invalide",
    });
    expect(service.fusionnerStructures).not.toHaveBeenCalled();
  });

  it("refuse une habilitation inconnue", async () => {
    const resultat = await detacherHabilitationAction({ structureId: CIBLE, habilitation: "expert" });

    expect(resultat.success).toBe(false);
    expect(service.detacherHabilitation).not.toHaveBeenCalled();
  });

  it("refuse un nom vide une fois les espaces retirés", async () => {
    expect(await renommerStructureAction({ structureId: CIBLE, nom: "   " })).toEqual({
      success: false,
      error: "Le nom est requis",
    });
  });

  it("renvoie le refus métier tel quel", async () => {
    vi.mocked(service.fusionnerStructures).mockRejectedValue(
      new service.RefusOperationStructure("Les deux structures ont déjà une habilitation AMO")
    );

    expect(await fusionnerStructuresAction({ cibleId: CIBLE, sourceId: SOURCE })).toEqual({
      success: false,
      error: "Les deux structures ont déjà une habilitation AMO",
    });
  });

  it("masque le détail d'une erreur technique", async () => {
    vi.mocked(service.fusionnerStructures).mockRejectedValue(
      new Error('duplicate key value violates unique constraint "allers_vers_structure_id_unique"')
    );

    expect(await fusionnerStructuresAction({ cibleId: CIBLE, sourceId: SOURCE })).toEqual({
      success: false,
      error: "Erreur inattendue, l'opération n'a pas été enregistrée",
    });
  });
});
