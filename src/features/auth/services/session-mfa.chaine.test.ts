import { describe, it, expect, vi, beforeEach } from "vitest";

// Seuls les cookies sont simulés : signature et vérification du JWT de session sont réelles.
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { cookies } from "next/headers";
import { createToken } from "../utils/jwt.utils";
import { getSession } from "./session.service";
import { AUTH_METHODS, COOKIE_NAMES, ROLES } from "../domain/value-objects/constants";
import type { JWTPayload } from "../domain/entities";

function poserSession(payload: Partial<JWTPayload>) {
  const jeton = createToken({
    userId: "agent-123",
    role: ROLES.AMO,
    authMethod: AUTH_METHODS.PROCONNECT,
    exp: Date.now() + 3600000,
    iat: Date.now(),
    ...payload,
  });
  vi.mocked(cookies).mockResolvedValue({
    get: (nom: string) => (nom === COOKIE_NAMES.SESSION ? { value: jeton } : undefined),
  } as never);
  return jeton;
}

describe("getSession — chaîne réelle de signature", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuse une session agent correctement signée, non expirée, mais émise avant la 2FA", async () => {
    poserSession({ idToken: "ancien-id-token" });

    expect(await getSession()).toBeNull();
  });

  it("accepte la même session portant une preuve MFA", async () => {
    poserSession({ proConnectAcr: "eidas1-mfa" });

    expect(await getSession()).toMatchObject({ userId: "agent-123", proConnectAcr: "eidas1-mfa" });
  });

  it("refuse une preuve MFA ajoutée à la main : la signature ne couvre plus la charge utile", async () => {
    const [entete, , signature] = poserSession({}).split(".");
    const falsifie = Buffer.from(
      JSON.stringify({
        userId: "agent-123",
        role: ROLES.AMO,
        authMethod: AUTH_METHODS.PROCONNECT,
        proConnectAcr: "eidas3",
        exp: Date.now() + 3600000,
        iat: Date.now(),
      })
    ).toString("base64url");
    vi.mocked(cookies).mockResolvedValue({
      get: () => ({ value: `${entete}.${falsifie}.${signature}` }),
    } as never);

    expect(await getSession()).toBeNull();
  });

  it("laisse passer un demandeur FranceConnect", async () => {
    poserSession({ role: ROLES.PARTICULIER, authMethod: AUTH_METHODS.FRANCECONNECT });

    expect(await getSession()).toMatchObject({ authMethod: AUTH_METHODS.FRANCECONNECT });
  });
});
