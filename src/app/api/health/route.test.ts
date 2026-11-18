import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/database", () => ({ db: { execute: vi.fn() } }));

import { db } from "@/shared/database";
import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => vi.clearAllMocks());

  it("base joignable → 200", async () => {
    vi.mocked(db.execute).mockResolvedValue([] as never);

    const reponse = await GET();

    expect(reponse.status).toBe(200);
    expect((await reponse.json()).checks).toEqual({ api: "OK", database: "OK" });
  });

  // Route publique : l'erreur de connexion peut citer l'hôte et l'utilisateur de la base.
  it("base injoignable → 503, sans le message d'erreur de la base", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(db.execute).mockRejectedValue(new Error("password authentication failed for user fonds_argile"));

    const reponse = await GET();
    const corps = JSON.stringify(await reponse.json());

    expect(reponse.status).toBe(503);
    expect(corps).not.toContain("password");
    expect(corps).not.toContain("fonds_argile");
  });
});
