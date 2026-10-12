import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/features/auth", () => ({
  AUTH_METHODS: { PROCONNECT: "proconnect", FRANCECONNECT: "franceconnect" },
  clearSessionCookies: vi.fn(),
  lireSessionSignee: vi.fn(),
}));
vi.mock("@/features/auth/adapters/proconnect/proconnect.service", () => ({
  generateLogoutUrl: vi.fn((idToken: string) => `https://pc.test/api/v2/session/end?id_token_hint=${idToken}`),
}));

import { POST } from "./route";
import { clearSessionCookies, lireSessionSignee } from "@/features/auth";

describe("POST /api/auth/pc/logout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ferme chez ProConnect une session signée mais antérieure à la 2FA", async () => {
    vi.mocked(lireSessionSignee).mockResolvedValue({
      userId: "agent-1",
      role: "amo",
      authMethod: "proconnect",
      idToken: "ancien-id-token",
      exp: Date.now() + 3600000,
      iat: Date.now(),
    });

    const response = await POST();

    expect(response.status).toBe(200);
    expect((await response.json()).redirectUrl).toContain("id_token_hint=ancien-id-token");
    expect(clearSessionCookies).toHaveBeenCalled();
  });

  it("sans session ProConnect lisible → efface tout de même les cookies", async () => {
    vi.mocked(lireSessionSignee).mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(400);
    expect(clearSessionCookies).toHaveBeenCalled();
  });
});
