import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { createMockAuthUser, createEnvConfigMock } from "@/shared/testing/mocks";

// Le rôle est relu en base par getCurrentUser : c'est lui qu'on simule, pas le JWT.
vi.mock("@/features/auth/services/user.service", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/shared/config/env.config", () => createEnvConfigMock());
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../services/import-structures.service", () => ({ importerStructures: vi.fn() }));

import { importerStructuresAction } from "./import-structures.actions";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { importerStructures } from "../services/import-structures.service";

const BILAN = {
  structuresCreees: 1,
  structuresMisesAJour: 0,
  habilitationsAjoutees: 1,
  habilitationsMisesAJour: 0,
  lignesRefusees: [],
  avertissements: [],
};

function fichier(nom = "structures.xlsx", role = "amo", remplacer?: string) {
  const donnees = new FormData();
  donnees.append("file", new File(["x"], nom));
  donnees.append("role", role);
  if (remplacer) donnees.append("remplacer", remplacer);
  return donnees;
}

function connecter(role: UserRole) {
  vi.mocked(getCurrentUser).mockResolvedValue(createMockAuthUser(role));
}

describe("importerStructuresAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.mocked(importerStructures).mockResolvedValue(BILAN);
  });

  it.each([UserRole.ANALYSTE, UserRole.AMO, UserRole.ALLERS_VERS, UserRole.AMO_ET_ALLERS_VERS, UserRole.PARTICULIER])(
    "refuse %s sans lire le fichier",
    async (role) => {
      connecter(role);
      expect((await importerStructuresAction(fichier())).success).toBe(false);
      expect(importerStructures).not.toHaveBeenCalled();
    }
  );

  it("ne donne qu'au super-administrateur le droit de changer des rôles, et transmet la demande de remplacement", async () => {
    connecter(UserRole.ADMINISTRATEUR);
    expect(await importerStructuresAction(fichier())).toEqual({ success: true, data: BILAN });
    expect(importerStructures).toHaveBeenLastCalledWith(expect.anything(), {
      role: "amo",
      peutChangerRoles: false,
      remplacer: false,
    });

    connecter(UserRole.SUPER_ADMINISTRATEUR);
    await importerStructuresAction(fichier("structures.xlsx", "allersVers", "oui"));
    expect(importerStructures).toHaveBeenLastCalledWith(expect.anything(), {
      role: "allersVers",
      peutChangerRoles: true,
      remplacer: true,
    });
  });

  it("réserve l'import des experts au super-administrateur, et refuse un rôle inconnu", async () => {
    connecter(UserRole.ADMINISTRATEUR);
    expect((await importerStructuresAction(fichier("experts.xlsx", "expert"))).success).toBe(false);
    expect((await importerStructuresAction(fichier("x.xlsx", "inconnu"))).success).toBe(false);
    expect(importerStructures).not.toHaveBeenCalled();
  });

  it("refuse un fichier qui n'est pas un .xlsx", async () => {
    connecter(UserRole.SUPER_ADMINISTRATEUR);
    expect((await importerStructuresAction(fichier("structures.csv"))).success).toBe(false);
    expect(importerStructures).not.toHaveBeenCalled();
  });
});
