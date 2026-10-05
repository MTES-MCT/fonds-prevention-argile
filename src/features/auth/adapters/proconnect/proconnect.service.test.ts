import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("./proconnect.config", () => ({ getProConnectConfig: vi.fn() }));
vi.mock("../../utils/jwt.utils", () => ({ createToken: vi.fn(() => "jeton-session") }));
vi.mock("@/shared/database/repositories", () => ({
  agentsRepo: { authenticateFromProConnect: vi.fn() },
}));
vi.mock("./proconnect-oidc", async (importOriginal) => {
  const original = await importOriginal<typeof import("./proconnect-oidc")>();
  return {
    ...original,
    getContexteVerificationProConnect: vi.fn(() => ({})),
    verifierIdTokenProConnect: vi.fn(),
    lireUserInfoProConnect: vi.fn(),
  };
});

import { cookies } from "next/headers";
import { getProConnectConfig } from "./proconnect.config";
import { createToken } from "../../utils/jwt.utils";
import { agentsRepo } from "@/shared/database/repositories";
import { JetonProConnectInvalideError, lireUserInfoProConnect, verifierIdTokenProConnect } from "./proconnect-oidc";
import { handleProConnectCallback } from "./proconnect.service";
import { COOKIE_NAMES } from "../../domain/value-objects";
import { UserRole } from "@/shared/domain/value-objects";

const USER_INFO = { sub: "sub-agent", email: "agent@exemple.fr", given_name: "Alex" };
const AGENT = { id: "agent-1", role: UserRole.AMO, givenName: "Alex", usualName: "Martin" };

let cookiesPoses: Map<string, string>;

function stubFetch() {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.endsWith("/token")) {
      return new Response(JSON.stringify({ id_token: "id-token", access_token: "access-token" }), { status: 200 });
    }
    return new Response(JSON.stringify(USER_INFO), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
  cookiesPoses = new Map([
    [COOKIE_NAMES.PC_STATE, "state-ok"],
    [COOKIE_NAMES.PC_NONCE, "nonce-ok"],
  ]);
  vi.mocked(cookies).mockResolvedValue({
    get: (nom: string) => (cookiesPoses.has(nom) ? { value: cookiesPoses.get(nom) } : undefined),
    set: (nom: string, valeur: string) => cookiesPoses.set(nom, valeur),
    delete: (nom: string) => cookiesPoses.delete(nom),
  } as never);
  vi.mocked(getProConnectConfig).mockReturnValue({
    clientId: "client",
    clientSecret: "secret",
    callbackUrl: "https://app.test/api/auth/pc/callback",
    urls: { token: "https://pc.test/api/v2/token", userinfo: "https://pc.test/api/v2/userinfo" },
  } as never);
  vi.mocked(verifierIdTokenProConnect).mockResolvedValue({ sub: "sub-agent", acr: "eidas1-mfa", amr: ["pwd"] });
  vi.mocked(lireUserInfoProConnect).mockResolvedValue({ ...USER_INFO });
  vi.mocked(agentsRepo.authenticateFromProConnect).mockResolvedValue(AGENT as never);
});

describe("handleProConnectCallback — vérification OIDC", () => {
  it("transmet au vérificateur l'id_token et le nonce stocké, puis crée la session", async () => {
    stubFetch();

    const resultat = await handleProConnectCallback("code", "state-ok");

    expect(resultat).toEqual({ success: true, role: UserRole.AMO });
    expect(verifierIdTokenProConnect).toHaveBeenCalledWith("id-token", "nonce-ok", expect.anything());
    expect(cookiesPoses.get(COOKIE_NAMES.SESSION)).toBe("jeton-session");
  });

  it("state invalide → aucun échange de code", async () => {
    const fetchMock = stubFetch();

    const resultat = await handleProConnectCallback("code", "state-falsifie");

    expect(resultat).toMatchObject({ success: false, shouldLogout: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("id_token invalide → ni UserInfo, ni base, ni session", async () => {
    const fetchMock = stubFetch();
    vi.mocked(verifierIdTokenProConnect).mockRejectedValue(new JetonProConnectInvalideError("signature"));

    const resultat = await handleProConnectCallback("code", "state-ok");

    expect(resultat).toMatchObject({ success: false, shouldLogout: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(agentsRepo.authenticateFromProConnect).not.toHaveBeenCalled();
    expect(createToken).not.toHaveBeenCalled();
  });

  it("UserInfo d'un autre sujet que l'id_token → aucune écriture en base", async () => {
    stubFetch();
    vi.mocked(lireUserInfoProConnect).mockResolvedValue({ ...USER_INFO, sub: "autre-sub" });

    const resultat = await handleProConnectCallback("code", "state-ok");

    expect(resultat).toMatchObject({ success: false, shouldLogout: true });
    expect(agentsRepo.authenticateFromProConnect).not.toHaveBeenCalled();
    expect(createToken).not.toHaveBeenCalled();
  });

  it("UserInfo JWT à la signature invalide → aucune écriture en base", async () => {
    stubFetch();
    vi.mocked(lireUserInfoProConnect).mockRejectedValue(new JetonProConnectInvalideError("signature"));

    const resultat = await handleProConnectCallback("code", "state-ok");

    expect(resultat).toMatchObject({ success: false, shouldLogout: true });
    expect(agentsRepo.authenticateFromProConnect).not.toHaveBeenCalled();
  });
});
