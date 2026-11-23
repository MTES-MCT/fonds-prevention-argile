import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/shared/config/env.config", () => ({ getServerEnv: () => ({ BASE_URL: "https://fonds.test" }) }));
vi.mock("@/shared/services/journal-securite/journal-securite", () => ({ journaliser: vi.fn() }));
vi.mock("@/features/auth", () => ({
  DEFAULT_REDIRECTS: { particulier: "/mon-compte" },
  getAndClearRedirectUrl: vi.fn(async () => null),
  handleFranceConnectCallback: vi.fn(),
  handleFranceConnectError: vi.fn(() => ({ code: "fc_access_denied", error: "Connexion annulée" })),
}));

import { getAndClearRedirectUrl, handleFranceConnectCallback } from "@/features/auth";
import { GET } from "./route";
import { journaliser } from "@/shared/services/journal-securite/journal-securite";

// Hôte étranger : aucune redirection ne doit en dépendre.
const appeler = (query: string) => GET(new NextRequest(`https://hote-usurpe.example/api/auth/fc/callback${query}`));
const destination = (reponse: Response) => new URL(reponse.headers.get("location")!);

describe("GET /api/auth/fc/callback", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["", "?code=abc", "?state=xyz"])(
    "paramètres « %s » incomplets → accueil, aucun échange de jeton",
    async (query) => {
      const cible = destination(await appeler(query));

      expect(cible.origin).toBe("https://fonds.test");
      expect(cible.searchParams.get("error")).toBe("fc_missing_params");
      expect(handleFranceConnectCallback).not.toHaveBeenCalled();
      expect(journaliser).toHaveBeenCalledExactlyOnceWith({
        evenement: "connexion_demandeur",
        resultat: "refus",
        acteur: { type: "anonyme" },
        motif: "parametres_manquants",
      });
    }
  );

  it("erreur renvoyée par FranceConnect → accueil, aucun échange de jeton même avec code et state", async () => {
    const cible = destination(await appeler("?error=access_denied&code=abc&state=xyz"));

    expect(cible.pathname).toBe("/");
    expect(cible.searchParams.get("error")).toBe("fc_access_denied");
    expect(handleFranceConnectCallback).not.toHaveBeenCalled();
    expect(journaliser).toHaveBeenCalledExactlyOnceWith({
      evenement: "connexion_demandeur",
      resultat: "refus",
      acteur: { type: "anonyme" },
      motif: "erreur_fournisseur",
      details: { code: "fc_access_denied" },
    });
  });

  it("state ou nonce refusé → accueil, sans lire l'adresse de retour", async () => {
    vi.mocked(handleFranceConnectCallback).mockResolvedValue({ success: false, shouldLogout: true } as never);

    const cible = destination(await appeler("?code=abc&state=forge"));

    expect(cible.href).toBe("https://fonds.test/");
    expect(getAndClearRedirectUrl).not.toHaveBeenCalled();
  });

  it("échec de l'échange → page de connexion, jamais l'espace demandeur", async () => {
    vi.mocked(handleFranceConnectCallback).mockResolvedValue({ success: false, error: "token invalide" } as never);

    const cible = destination(await appeler("?code=abc&state=xyz"));

    expect(cible.pathname).toBe("/connexion");
    expect(cible.searchParams.get("error")).toBe("fc_token_error");
  });

  it("exception inattendue → accueil avec un code générique, sans détail de l'erreur", async () => {
    vi.mocked(handleFranceConnectCallback).mockRejectedValue(new Error("FC_CLIENT_SECRET refusé"));

    const cible = destination(await appeler("?code=abc&state=xyz"));

    expect(cible.href).toBe("https://fonds.test/?error=fc_server_error");
  });

  it("succès → adresse de retour enregistrée, sinon espace demandeur, toujours sous BASE_URL", async () => {
    vi.mocked(handleFranceConnectCallback).mockResolvedValue({ success: true } as never);

    expect(destination(await appeler("?code=abc&state=xyz")).href).toBe("https://fonds.test/mon-compte");

    vi.mocked(getAndClearRedirectUrl).mockResolvedValueOnce("/mon-compte/simulation");
    expect(destination(await appeler("?code=abc&state=xyz")).href).toBe("https://fonds.test/mon-compte/simulation");
  });
});
