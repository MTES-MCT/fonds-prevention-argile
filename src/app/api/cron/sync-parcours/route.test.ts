import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const SECRET = "secret-cron-de-plus-de-trente-deux-caracteres";

vi.mock("@/shared/config/env.config", () => ({ getServerEnv: () => ({ CRON_SECRET: SECRET }) }));
vi.mock("@/features/parcours/dossiers-ds/services/parcours-sync-batch.service", () => ({ runSyncBatch: vi.fn() }));
// `after` n'existe que dans une requête servie par Next : ici on vérifie seulement s'il est armé.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: vi.fn(),
}));

import { after } from "next/server";
import { POST } from "./route";

function requete(authorization?: string) {
  return new NextRequest("http://localhost/api/cron/sync-parcours", {
    method: "POST",
    headers: authorization ? { authorization } : {},
  });
}

describe("POST /api/cron/sync-parcours", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([undefined, "Bearer mauvais-secret", `Basic ${SECRET}`, SECRET, "Bearer "])(
    "en-tête Authorization %s → 401, aucune synchronisation armée",
    async (authorization) => {
      const reponse = await POST(requete(authorization));

      expect(reponse.status).toBe(401);
      expect(after).not.toHaveBeenCalled();
    }
  );

  it("bon secret → 202 et synchronisation armée en arrière-plan", async () => {
    const reponse = await POST(requete(`Bearer ${SECRET}`));

    expect(reponse.status).toBe(202);
    expect(after).toHaveBeenCalledOnce();
  });
});
