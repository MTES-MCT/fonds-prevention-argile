import { describe, it, expect } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";
import { canAccessAdministration, canAccessEspaceAgent } from "./backoffice-access.service";

describe("backoffice-access.service (ADR-0015)", () => {
  describe("canAccessAdministration", () => {
    // Ouverture des stats nationales (ADR-0017) : les agents AMO / Allers-Vers
    // accèdent désormais à /administration (onglets stats uniquement).
    it.each([
      UserRole.SUPER_ADMINISTRATEUR,
      UserRole.ADMINISTRATEUR,
      UserRole.ANALYSTE,
      UserRole.AMO,
      UserRole.ALLERS_VERS,
      UserRole.AMO_ET_ALLERS_VERS,
    ])("autorise %s", (role) => {
      expect(canAccessAdministration(role)).toBe(true);
    });

    it("refuse PARTICULIER", () => {
      expect(canAccessAdministration(UserRole.PARTICULIER)).toBe(false);
    });
  });

  describe("canAccessEspaceAgent", () => {
    it.each([UserRole.SUPER_ADMINISTRATEUR, UserRole.AMO, UserRole.ALLERS_VERS, UserRole.AMO_ET_ALLERS_VERS])(
      "autorise %s indépendamment des départements",
      (role) => {
        expect(canAccessEspaceAgent(role, false)).toBe(true);
        expect(canAccessEspaceAgent(role, true)).toBe(true);
      }
    );

    it("ANALYSTE : autorisé seulement s'il a au moins un département (départemental)", () => {
      expect(canAccessEspaceAgent(UserRole.ANALYSTE, true)).toBe(true);
      expect(canAccessEspaceAgent(UserRole.ANALYSTE, false)).toBe(false);
    });

    it.each([UserRole.ADMINISTRATEUR, UserRole.PARTICULIER])("refuse %s", (role) => {
      expect(canAccessEspaceAgent(role, true)).toBe(false);
    });
  });
});
