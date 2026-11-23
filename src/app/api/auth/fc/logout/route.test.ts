import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/auth", () => ({
  AUTH_METHODS: { FRANCECONNECT: "franceconnect", PROCONNECT: "proconnect" },
  clearSessionCookies: vi.fn(),
  generateLogoutUrl: vi.fn(() => "https://fc.test/logout"),
  getSession: vi.fn(),
}));

import { clearSessionCookies, generateLogoutUrl, getSession } from "@/features/auth";
import { POST } from "./route";

describe("POST /api/auth/fc/logout", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["aucune session", null],
    ["session ProConnect", { authMethod: "proconnect", idToken: "jeton" }],
    ["session FranceConnect sans id_token", { authMethod: "franceconnect" }],
  ])("%s → 400, rien n'est effacé ni adressé à FranceConnect", async (_cas, session) => {
    vi.mocked(getSession).mockResolvedValue(session as never);

    const reponse = await POST();

    expect(reponse.status).toBe(400);
    expect(generateLogoutUrl).not.toHaveBeenCalled();
    expect(clearSessionCookies).not.toHaveBeenCalled();
  });

  it("session FranceConnect → cookies effacés et adresse de déconnexion du fournisseur", async () => {
    vi.mocked(getSession).mockResolvedValue({ authMethod: "franceconnect", idToken: "jeton" } as never);

    expect(await (await POST()).json()).toEqual({ success: true, redirectUrl: "https://fc.test/logout" });
    expect(clearSessionCookies).toHaveBeenCalledOnce();
  });

  it("erreur interne → 500 sans détail", async () => {
    vi.mocked(getSession).mockRejectedValue(new Error("secret JWT absent"));

    const reponse = await POST();

    expect(reponse.status).toBe(500);
    expect(await reponse.json()).toEqual({ success: false, error: "Erreur serveur" });
  });
});
