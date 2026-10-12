import { describe, it, expect } from "vitest";
import { ACR_MFA_PROCONNECT, buildClaimsMfaProConnect, estAcrMfa, estSessionConforme } from "./session-mfa";
import { AUTH_METHODS } from "./constants";
import { UserRole } from "@/shared/domain/value-objects";

describe("estAcrMfa", () => {
  it.each(["eidas0-mfa", "eidas1-mfa", "eidas2", "eidas3"])("accepte %s", (acr) => {
    expect(estAcrMfa(acr)).toBe(true);
  });

  it.each([
    ["absent", undefined],
    ["null", null],
    ["vide", ""],
    ["eidas0", "eidas0"],
    ["eidas1", "eidas1"],
    ["ancienne URI 2FA", "https://proconnect.gouv.fr/assurance/consistency-checked-2fa"],
    ["certification dirigeant", "https://proconnect.gouv.fr/assurance/certification-dirigeant"],
    ["casse différente", "EIDAS2"],
    ["tableau", ["eidas2"]],
    ["objet", { value: "eidas2" }],
  ])("refuse un acr %s", (_cas, acr) => {
    expect(estAcrMfa(acr)).toBe(false);
  });
});

describe("buildClaimsMfaProConnect", () => {
  it("exige un acr parmi les quatre niveaux MFA, sans enveloppe claims supplémentaire", () => {
    expect(JSON.parse(buildClaimsMfaProConnect())).toEqual({
      id_token: { acr: { essential: true, values: [...ACR_MFA_PROCONNECT] } },
    });
  });
});

describe("estSessionConforme", () => {
  it("accepte une session ProConnect portant un acr MFA", () => {
    expect(
      estSessionConforme({ authMethod: AUTH_METHODS.PROCONNECT, role: UserRole.AMO, proConnectAcr: "eidas1-mfa" })
    ).toBe(true);
  });

  it.each([
    ["sans acr (antérieure à la 2FA)", undefined],
    ["acr non MFA", "eidas1"],
  ])("refuse une session ProConnect %s", (_cas, proConnectAcr) => {
    expect(estSessionConforme({ authMethod: AUTH_METHODS.PROCONNECT, role: UserRole.AMO, proConnectAcr })).toBe(false);
  });

  it("refuse la méthode historique par mot de passe, même avec un rôle admin", () => {
    expect(estSessionConforme({ authMethod: AUTH_METHODS.PASSWORD, role: UserRole.SUPER_ADMINISTRATEUR })).toBe(false);
  });

  it("laisse passer un demandeur FranceConnect, hors périmètre de la 2FA", () => {
    expect(estSessionConforme({ authMethod: AUTH_METHODS.FRANCECONNECT, role: UserRole.PARTICULIER })).toBe(true);
  });

  it("refuse un rôle agent porté par une session FranceConnect", () => {
    expect(estSessionConforme({ authMethod: AUTH_METHODS.FRANCECONNECT, role: UserRole.ADMINISTRATEUR })).toBe(false);
  });

  it.each([
    ["nulle", null],
    ["sans méthode", { role: UserRole.PARTICULIER }],
  ])("refuse une session %s", (_cas, session) => {
    expect(estSessionConforme(session)).toBe(false);
  });
});
