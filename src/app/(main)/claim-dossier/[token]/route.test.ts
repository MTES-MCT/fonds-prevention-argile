import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/shared/config/env.config", () => ({
  getServerEnv: () => ({ BASE_URL: "https://fonds.test" }),
  isProduction: () => true,
}));
vi.mock("@/shared/database/repositories", () => ({ userRepo: { findByClaimToken: vi.fn() } }));

import { userRepo } from "@/shared/database/repositories";
import { GET } from "./route";

// L'hôte de la requête est volontairement étranger : les redirections ne doivent dépendre que de BASE_URL.
function appeler(token: string) {
  return GET(new NextRequest(`https://hote-usurpe.example/claim-dossier/${token}`), {
    params: Promise.resolve({ token }),
  });
}

describe("GET /claim-dossier/[token]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("jeton inconnu, expiré ou déjà consommé → page d'erreur, aucun cookie posé", async () => {
    vi.mocked(userRepo.findByClaimToken).mockResolvedValue(null as never);

    const reponse = await appeler("jeton-inconnu");

    expect(reponse.headers.get("location")).toBe("https://fonds.test/claim-dossier/invalide");
    expect(reponse.headers.getSetCookie()).toEqual([]);
  });

  it("jeton valide → connexion, cookie httpOnly et sécurisé de 15 minutes", async () => {
    vi.mocked(userRepo.findByClaimToken).mockResolvedValue({ id: "stub" } as never);

    const reponse = await appeler("jeton-valide");
    const [cookie] = reponse.headers.getSetCookie();

    expect(reponse.headers.get("location")).toBe("https://fonds.test/connexion");
    expect(cookie).toContain("jeton-valide");
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/Max-Age=900/i);
  });
});
