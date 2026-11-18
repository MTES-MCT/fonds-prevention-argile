import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/config/env.config", () => ({ getServerEnv: () => ({ BASE_URL: "https://fonds.test" }) }));
vi.mock("@/features/auth", () => ({
  ROUTES: { connexion: { particulier: "/connexion", agent: "/connexion/agent" } },
}));
vi.mock("@/features/auth/adapters/proconnect/proconnect.service", () => ({ generateAuthorizationUrl: vi.fn() }));

import { generateAuthorizationUrl } from "@/features/auth/adapters/proconnect/proconnect.service";
import { GET } from "./route";

describe("GET /api/auth/pc/login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirige vers l'adresse d'autorisation construite côté serveur", async () => {
    vi.mocked(generateAuthorizationUrl).mockResolvedValue("https://fournisseur.test/authorize?state=abc");

    expect((await GET()).headers.get("location")).toBe("https://fournisseur.test/authorize?state=abc");
  });

  it("ProConnect injoignable ou mal configuré → page de connexion avec un code générique, sans détail", async () => {
    vi.mocked(generateAuthorizationUrl).mockRejectedValue(new Error("client_secret refusé"));

    expect((await GET()).headers.get("location")).toBe("https://fonds.test/connexion/agent?error=pc_init_failed");
  });
});
