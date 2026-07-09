import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/features/parcours/dossiers-ds/services/pieces-justificatives.service", () => ({
  getConfiguredDemarcheNumbers: vi.fn(() => new Set([146377, 129894])),
  getFreshModeleUrl: vi.fn(),
}));

import { GET } from "./route";
import { getFreshModeleUrl } from "@/features/parcours/dossiers-ds/services/pieces-justificatives.service";

const mockedFresh = vi.mocked(getFreshModeleUrl);

function req(qs: string) {
  return new NextRequest(`http://localhost/api/ds/piece-modele${qs}`);
}

describe("GET /api/ds/piece-modele", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirige (302, no-store) vers l'URL fraîche du modèle DN", async () => {
    mockedFresh.mockResolvedValue("https://static.dn/fresh?temp_url_sig=abc");

    const res = await GET(req("?demarche=146377&champ=champ-1"));

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://static.dn/fresh?temp_url_sig=abc");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(mockedFresh).toHaveBeenCalledWith(146377, "champ-1");
  });

  it("400 si un paramètre manque", async () => {
    const res = await GET(req("?demarche=146377"));
    expect(res.status).toBe(400);
    expect(mockedFresh).not.toHaveBeenCalled();
  });

  it("400 si la démarche n'est pas dans la whitelist (anti open-proxy)", async () => {
    const res = await GET(req("?demarche=999999&champ=champ-1"));
    expect(res.status).toBe(400);
    expect(mockedFresh).not.toHaveBeenCalled();
  });

  it("404 si le modèle est introuvable côté DN", async () => {
    mockedFresh.mockResolvedValue(null);

    const res = await GET(req("?demarche=146377&champ=inconnu"));

    expect(res.status).toBe(404);
  });
});
