import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/shared/config/env.config", () => ({ getServerEnv: () => ({ BASE_URL: "https://fonds.test" }) }));
vi.mock("@/features/auth", () => ({
  ROUTES: { api: { auth: { fc: { callback: "/api/auth/fc/callback" } } }, connexion: { particulier: "/connexion" } },
}));

import { GET } from "./route";

describe("GET /oidc-callback", () => {
  it("relaie les paramètres vers le callback FranceConnect, sous BASE_URL quel que soit l'hôte reçu", async () => {
    const reponse = await GET(new NextRequest("https://hote-usurpe.example/oidc-callback?code=abc&state=xyz"));

    expect(reponse.headers.get("location")).toBe("https://fonds.test/api/auth/fc/callback?code=abc&state=xyz");
  });

  it("ne suit aucune destination fournie par l'appelant", async () => {
    const reponse = await GET(
      new NextRequest(
        "https://fonds.test/oidc-callback?redirect_uri=https://site-pirate.example&next=//site-pirate.example"
      )
    );

    expect(new URL(reponse.headers.get("location")!).origin).toBe("https://fonds.test");
  });
});
