import { describe, it, expect } from "vitest";
import { UserRole } from "./user-role.enum";
import { resoudreRoleAgent, roleDepuisStructure } from "./role-structure";

describe("roleDepuisStructure", () => {
  it.each([
    [{ amo: true, allersVers: true }, UserRole.AMO_ET_ALLERS_VERS],
    [{ amo: true, allersVers: false }, UserRole.AMO],
    [{ amo: false, allersVers: true }, UserRole.ALLERS_VERS],
    [{ amo: false, allersVers: false }, null],
  ])("habilitations %o -> %s", (habilitations, attendu) => {
    expect(roleDepuisStructure(habilitations)).toBe(attendu);
  });
});

describe("resoudreRoleAgent", () => {
  const aucune = { amo: false, allersVers: false };

  it("prend le rôle de la structure, quel que soit le rôle stocké", () => {
    expect(
      resoudreRoleAgent({
        structureId: "s-1",
        roleStocke: UserRole.AMO,
        habilitations: { amo: false, allersVers: true },
      })
    ).toBe(UserRole.ALLERS_VERS);
  });

  it("ne donne rien à un agent de structure dont la structure n'a plus d'habilitation", () => {
    expect(resoudreRoleAgent({ structureId: "s-1", roleStocke: UserRole.AMO, habilitations: aucune })).toBeNull();
  });

  it.each([UserRole.SUPER_ADMINISTRATEUR, UserRole.ADMINISTRATEUR, UserRole.ANALYSTE])(
    "garde le rôle plateforme %s d'un agent sans structure",
    (role) => {
      expect(resoudreRoleAgent({ structureId: null, roleStocke: role, habilitations: aucune })).toBe(role);
    }
  );

  it.each([UserRole.AMO, UserRole.ALLERS_VERS, UserRole.AMO_ET_ALLERS_VERS])(
    "ne donne rien à un rôle de structure %s sans structure (compte orphelin)",
    (role) => {
      expect(resoudreRoleAgent({ structureId: null, roleStocke: role, habilitations: aucune })).toBeNull();
    }
  );
});
