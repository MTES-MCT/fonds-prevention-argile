import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/config/env.config", () => ({ getServerEnv: () => ({ BASE_URL: "https://fonds.test" }) }));
vi.mock("@/features/auth", () => ({
  ROUTES: { connexion: { particulier: "/connexion", agent: "/connexion/agent" } },
}));
vi.mock("@/features/auth/adapters/proconnect/proconnect.service", () => ({ generateAuthorizationUrl: vi.fn() }));

import { generateAuthorizationUrl } from "@/features/auth/adapters/proconnect/proconnect.service";
import { DEBITS, reinitialiserDebits } from "@/shared/services/limitation-debit/limitation-debit";
import { GET } from "./route";

const requete = () => new Request("https://fonds.test/api/auth/pc/login", { headers: { "x-real-ip": "203.0.113.1" } });

describe("GET /api/auth/pc/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reinitialiserDebits();
  });

  it("redirige vers l'adresse d'autorisation construite côté serveur", async () => {
    vi.mocked(generateAuthorizationUrl).mockResolvedValue("https://fournisseur.test/authorize?state=abc");

    expect((await GET(requete())).headers.get("location")).toBe("https://fournisseur.test/authorize?state=abc");
  });

  it("ProConnect injoignable ou mal configuré → page de connexion avec un code générique, sans détail", async () => {
    vi.mocked(generateAuthorizationUrl).mockRejectedValue(new Error("client_secret refusé"));

    expect((await GET(requete())).headers.get("location")).toBe(
      "https://fonds.test/connexion/agent?error=pc_init_failed"
    );
  });

  it("au-delà du plafond de connexion → 429, sans préparer de nouvelle connexion", async () => {
    vi.mocked(generateAuthorizationUrl).mockResolvedValue("https://fournisseur.test/authorize");
    for (let i = 0; i < DEBITS.connexion.max; i++) await GET(requete());
    vi.mocked(generateAuthorizationUrl).mockClear();

    expect((await GET(requete())).status).toBe(429);
    expect(generateAuthorizationUrl).not.toHaveBeenCalled();
  });
});
